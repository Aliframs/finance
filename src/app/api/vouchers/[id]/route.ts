import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";
import { canEdit } from "@/lib/workflow-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();

    const { id } = await params;
    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: true,
        journals: {
          include: { coa: true },
        },
        attachments: true,
        auditLogs: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
        revisions: {
          include: { requestedBy: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: "Voucher not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(voucher);
  } catch (error) {
    console.error("GET /api/vouchers/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateVoucherSchema = z.object({
  items: z.array(
    z.object({
      description: z.string().min(1, "Keterangan wajib diisi"),
      type: z.enum(["BARANG", "JASA"]).optional().default("BARANG"),
      unit: z.string().optional().default("pcs"),
      qty: z.number().min(1, "Qty wajib diisi"),
      price: z.number().optional().default(0),
      nominal: z.number({ invalid_type_error: "Nominal harus angka valid" })
    })
  ).optional(),
  date: z.string().optional(),
  type: z.string().optional(),
  vendorId: z.string().optional(),
  nominal: z.number().optional(),
  discountPercentage: z.number().optional(),
  ppnPercentage: z.number().optional(),
  pphPercentage: z.number().optional(),
  grandTotal: z.number().optional(),
  remarks: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    const { id } = await params;
    const oldVoucher = await prisma.voucher.findUnique({ where: { id } });
    if (!oldVoucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

    if (!canEdit(oldVoucher.status, user.role)) {
      return forbiddenResponse("Anda tidak memiliki izin untuk mengedit voucher pada status ini");
    }

    const body = await req.json();
    const parsed = updateVoucherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: any = { ...parsed.data };
    
    if (parsed.data.date) {
      updateData.date = new Date(parsed.data.date);
    }

    if (parsed.data.vendorId) {
      const vendor = await prisma.masterVendor.findUnique({ where: { id: parsed.data.vendorId } });
      if (vendor) {
        updateData.bankName = vendor.bankName;
        updateData.accountNumber = vendor.accountNumber;
        updateData.accountName = vendor.accountName;
      }
    }

    if (parsed.data.items) {
      updateData.nominal = parsed.data.nominal || parsed.data.items.reduce((acc, item) => acc + item.nominal, 0);
      updateData.items = {
        deleteMany: {}, // Delete old items
        create: parsed.data.items // Create new items
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedVoucher = await tx.voucher.update({
        where: { id },
        data: updateData,
      });
      
      // If there's an open revision for VOUCHER, the submitter is making an edit
      // we do NOT automatically resolve it here. The submitter must click "Approve" (which is the FINISH_AMENDMENT / RESUBMIT logic in the frontend).
      
      if (oldVoucher.status === "COMPLETED") {
        await tx.auditLog.create({
          data: {
            voucherId: id,
            userId: user.id,
            action: "EDIT_COMPLETED_VOUCHER",
            notes: "Mengubah data voucher / rincian item setelah status COMPLETED",
          }
        });
      }

      return updatedVoucher;
    });

    // Sync to Apps Script to update any existing journals when voucher header changes (e.g. Voucher Number or Vendor changes)
    const journals = await prisma.journal.findMany({ where: { voucherId: id } });
    if (journals.length > 0) {
      const { sendToAppsScript } = await import("@/lib/google-sheets-service");
      for (const j of journals) {
        await sendToAppsScript("UPDATE", j.id).catch(err => console.error("Sync failed:", err));
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/vouchers/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (user.role !== "ADMIN") {
      return forbiddenResponse("Hanya Admin yang dapat menghapus voucher secara permanen");
    }

    const { id } = await params;
    
    const voucherToDelete = await prisma.voucher.findUnique({ where: { id } });
    if (!voucherToDelete) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

    // Fetch journals before deleting them so we can sync to Apps Script
    const journalsToDelete = await prisma.journal.findMany({ where: { voucherId: id } });
    
    // Send delete webhooks BEFORE deleting from DB so the google-sheets-service can still find it to know its fiscalYear
    // Sending sequentially to prevent Google Apps Script race condition lock errors
    const { sendToAppsScript } = await import("@/lib/google-sheets-service");
    for (const j of journalsToDelete) {
      await sendToAppsScript("DELETE", j.id).catch(err => console.error("Sync failed:", err));
    }

    await prisma.$transaction([
      prisma.voucherItem.deleteMany({ where: { voucherId: id } }),
      prisma.auditLog.deleteMany({ where: { voucherId: id } }),
      prisma.journal.deleteMany({ where: { voucherId: id } }),
      prisma.attachment.deleteMany({ where: { voucherId: id } }),
      prisma.voucher.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/vouchers/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
