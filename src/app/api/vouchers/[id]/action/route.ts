import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  canApprove,
  canDelete,
  getNextStatus,
} from "@/lib/workflow-engine";
import { z } from "zod";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";
import { notifyRole, getRoleForStatus } from "@/lib/notification-helper";

const actionSchema = z.object({
  action: z.enum(["APPROVE", "SOFT_DELETE", "HOLD", "NOTE", "UPLOAD", "UPDATE_REMARKS", "RESTORE", "AMENDMENT", "FINISH_AMENDMENT", "REVISION", "CANCEL_REVISION"]),
  revisionTarget: z.enum(["REVISION_VOUCHER", "REVISION_JOURNAL"]).optional(),
  remarks: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();

    const { id } = await params;
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, notes, remarks } = parsed.data;
    const userRole = user.role;
    const realUserId = user.id;

    // Find the voucher
    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // ─── APPROVE ─────────────────────────────────
    if (action === "APPROVE") {
      if (!canApprove(voucher.status, userRole)) {
        return NextResponse.json(
          { error: `Role ${userRole} tidak dapat approve pada status ${voucher.status}` },
          { status: 403 }
        );
      }

      const nextStatus = getNextStatus(voucher.status);
      if (!nextStatus) {
        return NextResponse.json({ error: "Transisi status tidak valid" }, { status: 400 });
      }

      // Check Journal Balance
      const journals = await prisma.journal.findMany({ where: { voucherId: id } });
      if (journals.length > 0) {
        const totalDebit = journals.reduce((sum, j) => sum + j.debit, 0);
        const totalCredit = journals.reduce((sum, j) => sum + j.credit, 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
          return NextResponse.json({ error: "Journal Entries belum balance (Debit != Kredit). Tidak bisa Approve." }, { status: 400 });
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedVoucher = await tx.voucher.update({
          where: { id },
          data: { status: nextStatus },
        });

        await tx.auditLog.create({
          data: {
            voucherId: id,
            userId: realUserId,
            action: "APPROVE",
            notes: notes || `Disetujui oleh ${userRole}`,
            oldValue: voucher.status,
            newValue: nextStatus,
          },
        });

        // Check for OPEN revision and resolve it
        const openRevision = await tx.revision.findFirst({
          where: { voucherId: id, status: "OPEN" },
          orderBy: { createdAt: "desc" }
        });
        
        if (openRevision) {
          const snapshotData = await tx.voucher.findUnique({
            where: { id },
            include: { items: true, journals: true, attachments: true, vendor: true }
          });
          await tx.revision.update({
            where: { id: openRevision.id },
            data: { 
              status: "RESOLVED", 
              resolvedAt: new Date(),
              afterSnapshot: JSON.stringify(snapshotData)
            }
          });
        }

        return updatedVoucher;
      });

      const targetRole = getRoleForStatus(nextStatus);
      if (targetRole) {
        await notifyRole(targetRole, "Voucher Approved", `Voucher ${voucher.voucherNumber} telah di-approve dan menunggu tindakan Anda.`, `/vouchers/${id}`);
      }

      return NextResponse.json(updated);
    }

    // ─── SOFT DELETE ─────────────────────────────
    if (action === "SOFT_DELETE") {
      if (!canDelete(voucher.status, userRole)) {
        return NextResponse.json(
          { error: `Role ${userRole} tidak dapat menghapus voucher ini` },
          { status: 403 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedVoucher = await tx.voucher.update({
          where: { id },
          data: { status: "CANCELLED" },
        });

        await tx.auditLog.create({
          data: {
            voucherId: id,
            userId: realUserId,
            action: "SOFT_DELETE",
            notes: notes || "Voucher dibatalkan (soft delete)",
            oldValue: voucher.status,
            newValue: "CANCELLED",
          },
        });

        return updatedVoucher;
      });

      // Sync to Google Sheets: Remove journals since it's cancelled
      const journalsToDelete = await prisma.journal.findMany({ where: { voucherId: id } });
      if (journalsToDelete.length > 0) {
        const { sendToAppsScript } = await import("@/lib/google-sheets-service");
        for (const j of journalsToDelete) {
          await sendToAppsScript("DELETE", j.id).catch(err => console.error("Sync failed:", err));
        }
      }

      return NextResponse.json(updated);
    }

    // ─── NOTE ────────────────────────────────────
    if (action === "NOTE") {
      if (!notes?.trim()) {
        return NextResponse.json({ error: "Catatan tidak boleh kosong" }, { status: 400 });
      }

      await prisma.auditLog.create({
        data: {
          voucherId: id,
          userId: realUserId,
          action: "NOTE",
          notes,
        },
      });

      return NextResponse.json({ success: true });
    }

    // ─── UPLOAD (audit log only) ─────────────────
    if (action === "UPLOAD") {
      await prisma.auditLog.create({
        data: {
          voucherId: id,
          userId: realUserId,
          action: "UPLOAD",
          notes: notes || "Lampiran diunggah",
        },
      });

      return NextResponse.json({ success: true });
    }

    // ─── UPDATE REMARKS (For PDF) ────────────────
    if (action === "UPDATE_REMARKS") {
      if (userRole !== "ADMIN" && userRole !== "ACCOUNTING_2") {
        return forbiddenResponse("Role tidak diizinkan mengubah remarks");
      }

      await prisma.voucher.update({
        where: { id },
        data: { remarks: remarks || null },
      });

      return NextResponse.json({ success: true });
    }

    // ─── RESTORE ─────────────────────────────────
    if (action === "RESTORE") {
      if (userRole !== "ADMIN") {
        return forbiddenResponse("Hanya Admin yang dapat memulihkan voucher");
      }

      // Cari status sebelumnya dari audit log
      const lastDeleteLog = await prisma.auditLog.findFirst({
        where: { voucherId: id, action: "SOFT_DELETE" },
        orderBy: { createdAt: "desc" },
      });
      const previousStatus = lastDeleteLog?.oldValue || "DRAFT";

      const updated = await prisma.$transaction(async (tx) => {
        const updatedVoucher = await tx.voucher.update({
          where: { id },
          data: { status: previousStatus },
        });

        await tx.auditLog.create({
          data: {
            voucherId: id,
            userId: realUserId,
            action: "RESTORE",
            notes: notes || "Voucher dipulihkan (Restore)",
            oldValue: "CANCELLED",
            newValue: previousStatus,
          },
        });

        return updatedVoucher;
      });

      // Sync to Google Sheets: Re-add journals since it's restored
      const journalsToRestore = await prisma.journal.findMany({ where: { voucherId: id } });
      if (journalsToRestore.length > 0) {
        const { sendToAppsScript } = await import("@/lib/google-sheets-service");
        for (const j of journalsToRestore) {
          await sendToAppsScript("CREATE", j.id).catch(err => console.error("Sync failed:", err));
        }
      }

      return NextResponse.json(updated);
    }

    // ─── AMENDMENT ───────────────────────────────
    if (action === "AMENDMENT") {
      if (voucher.status !== "COMPLETED") {
        return NextResponse.json({ error: "Hanya voucher Selesai (COMPLETED) yang bisa di-amend" }, { status: 400 });
      }
      if (userRole !== "ACCOUNTING_1" && userRole !== "ACCOUNTING_2") {
        return forbiddenResponse("Role tidak diizinkan melakukan Amendment");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedVoucher = await tx.voucher.update({
          where: { id },
          data: { status: "AMENDING" },
        });

        await tx.auditLog.create({
          data: {
            voucherId: id,
            userId: realUserId,
            action: "AMENDMENT",
            notes: notes || "Melakukan Amendment (Sedang Direvisi)",
            oldValue: voucher.status,
            newValue: "AMENDING",
          },
        });

        return updatedVoucher;
      });

      return NextResponse.json(updated);
    }

    // ─── FINISH AMENDMENT ────────────────────────
    if (action === "FINISH_AMENDMENT") {
      if (voucher.status !== "AMENDING") {
        return NextResponse.json({ error: "Hanya voucher yang sedang direvisi (AMENDING) yang bisa diselesaikan" }, { status: 400 });
      }
      if (userRole !== "ACCOUNTING_1" && userRole !== "ACCOUNTING_2") {
        return forbiddenResponse("Role tidak diizinkan menyelesaikan Amendment");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedVoucher = await tx.voucher.update({
          where: { id },
          data: { status: "COMPLETED" },
        });

        await tx.auditLog.create({
          data: {
            voucherId: id,
            userId: realUserId,
            action: "FINISH_AMENDMENT",
            notes: notes || "Selesai Melakukan Revisi",
            oldValue: voucher.status,
            newValue: "COMPLETED",
          },
        });

        return updatedVoucher;
      });

      return NextResponse.json(updated);
    }

    // ─── REVISION ────────────────────────────────
    if (action === "REVISION") {
      const allowedRoles = ["ACCOUNTING_1", "ACCOUNTING_2", "ACCOUNTING_3"];
      if (!allowedRoles.includes(userRole)) {
        return forbiddenResponse("Hanya tim Accounting yang dapat mengajukan revisi");
      }
      
      if (!parsed.data.revisionTarget || !notes?.trim()) {
        return NextResponse.json({ error: "Target revisi dan notes wajib diisi" }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const snapshotData = await tx.voucher.findUnique({
          where: { id },
          include: { items: true, journals: true, attachments: true, vendor: true }
        });
        
        const nextStatus = parsed.data.revisionTarget as string;
        
        const updatedVoucher = await tx.voucher.update({
          where: { id },
          data: { status: nextStatus },
        });

        await tx.revision.create({
          data: {
            voucherId: id,
            requestedById: realUserId,
            type: nextStatus,
            notes: notes,
            beforeSnapshot: JSON.stringify(snapshotData),
            status: "OPEN"
          }
        });

        await tx.auditLog.create({
          data: {
            voucherId: id,
            userId: realUserId,
            action: nextStatus,
            notes,
            oldValue: voucher.status,
            newValue: nextStatus,
          },
        });
        
        const targetRole = nextStatus === "REVISION_VOUCHER" ? "ADMIN" : "ACCOUNTING_2";
        const targetUsers = await tx.user.findMany({ where: { role: targetRole } });
        
        if (targetUsers.length > 0) {
          await tx.notification.createMany({
            data: targetUsers.map(u => ({
              userId: u.id,
              title: "Revisi Diperlukan",
              message: `Voucher ${voucher.voucherNumber} dikembalikan untuk revisi. Catatan: ${notes}`,
              link: `/vouchers/${voucher.id}`
            }))
          });
        }

        return updatedVoucher;
      });

      return NextResponse.json(updated);
    }

    // ─── CANCEL REVISION ─────────────────────────
    if (action === "CANCEL_REVISION") {
      if (voucher.status !== "REVISION_VOUCHER" && voucher.status !== "REVISION_JOURNAL") {
        return NextResponse.json({ error: "Voucher tidak sedang direvisi" }, { status: 400 });
      }
      
      const openRevision = await prisma.revision.findFirst({
        where: { voucherId: id, status: "OPEN" },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!openRevision) {
         return NextResponse.json({ error: "Tidak ada revisi aktif" }, { status: 400 });
      }
      
      if (openRevision.requestedById !== realUserId && userRole !== "ADMIN") {
         return forbiddenResponse("Hanya pemohon revisi yang dapat membatalkannya");
      }
      
      const lastAudit = await prisma.auditLog.findFirst({
         where: { voucherId: id, action: openRevision.type },
         orderBy: { createdAt: 'desc' }
      });
      const previousStatus = lastAudit?.oldValue || "WAITING_ACCOUNTING_1";
      
      const updated = await prisma.$transaction(async (tx) => {
         const updatedVoucher = await tx.voucher.update({
            where: { id },
            data: { status: previousStatus }
         });
         
         await tx.revision.update({
            where: { id: openRevision.id },
            data: { status: "CANCELLED" }
         });
         
         await tx.auditLog.create({
          data: {
            voucherId: id,
            userId: realUserId,
            action: "CANCEL_REVISION",
            notes: "Revisi dibatalkan oleh pemohon",
            oldValue: voucher.status,
            newValue: previousStatus,
          },
        });
        
        return updatedVoucher;
      });
      
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/vouchers/[id]/action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
