import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { sendToAppsScript } from "@/lib/google-sheets-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";
import { canInputJournal } from "@/lib/workflow-engine";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, journalId: string }> }
) {
  try {
    const user = await getAuthUser();
    
    const { id, journalId } = await params;

    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    if (!canInputJournal(user.role, voucher.status) && user.role !== "ADMIN") {
      return forbiddenResponse("Hanya Admin dan Accounting yang berhak menghapus jurnal pada status ini");
    }

    const oldJournal = await prisma.journal.findUnique({ where: { id: journalId }, include: { coa: true } });
    if (!oldJournal) return NextResponse.json({ error: "Journal not found" }, { status: 404 });

    // Call webhook BEFORE deleting so it can fetch the fiscalYear
    await sendToAppsScript("DELETE", journalId).catch(err => console.error("Sync failed:", err));

    await prisma.journal.delete({ where: { id: journalId } });

    if (voucher.status === "COMPLETED") {
      await prisma.auditLog.create({
        data: {
          voucherId: id,
          userId: user.id,
          action: "DELETE_JOURNAL_COMPLETED",
          notes: `Menghapus jurnal ${oldJournal.coa?.accountName || '-'}: ${oldJournal.description || '-'} (Debit: ${oldJournal.debit}, Kredit: ${oldJournal.credit}) setelah status COMPLETED`,
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/vouchers/[id]/journals/[journalId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


const updateJournalSchema = z.object({
  coaId: z.string().min(1),
  description: z.string().optional(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  date: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string, journalId: string }> }
) {
  try {
    const user = await getAuthUser();
    
    const { id, journalId } = await params;
    const body = await req.json();
    const parsed = updateJournalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid journal data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { coaId, description, debit, credit, date } = parsed.data;

    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    if (!canInputJournal(user.role, voucher.status) && user.role !== "ADMIN") {
      return forbiddenResponse("Hanya Admin dan Accounting yang berhak mengubah jurnal pada status ini");
    }

    const updated = await prisma.journal.update({
      where: { id: journalId },
      data: {
        coaId,
        description,
        debit,
        credit,
        date: date ? new Date(date) : undefined,
      },
      include: { coa: true },
    });

    if (voucher.status === "COMPLETED") {
      await prisma.auditLog.create({
        data: {
          voucherId: id,
          userId: user.id,
          action: "EDIT_JOURNAL_COMPLETED",
          notes: `Mengubah jurnal ${updated.coa?.accountName || '-'}: ${description || '-'} (Debit: ${debit}, Kredit: ${credit}) setelah status COMPLETED`,
        }
      });
    }

    sendToAppsScript("UPDATE", updated.id).catch(err => console.error("Sync failed:", err));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/vouchers/[id]/journals/[journalId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
