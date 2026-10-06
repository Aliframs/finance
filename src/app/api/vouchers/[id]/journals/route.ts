import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { sendToAppsScript } from "@/lib/google-sheets-service";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";
import { canInputJournal } from "@/lib/workflow-engine";

const journalSchema = z.object({
  coaId: z.string().min(1),
  description: z.string().optional(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  date: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    
    const { id } = await params;
    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // Check if user has permission to input journal
    if (!canInputJournal(user.role, voucher.status) && user.role !== "ADMIN") {
      return forbiddenResponse("Hanya Admin dan Accounting yang berhak menambahkan jurnal pada status ini");
    }

    const body = await req.json();
    const parsed = journalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid journal data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { coaId, description, debit, credit, date } = parsed.data;

    const created = await prisma.journal.create({
      data: {
        voucherId: id,
        coaId,
        description,
        debit,
        credit,
        date: date ? new Date(date) : new Date(),
        fiscalYear: voucher.fiscalYear,
      },
      include: { coa: true },
    });

    if (voucher.status === "COMPLETED") {
      await prisma.auditLog.create({
        data: {
          voucherId: id,
          userId: user.id,
          action: "ADD_JOURNAL_COMPLETED",
          notes: `Menambahkan jurnal: ${description || '-'} (Debit: ${debit}, Kredit: ${credit}) setelah status COMPLETED`,
        }
      });
    }

    await sendToAppsScript("CREATE", created.id).catch(err => console.error("Sync failed:", err));

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/vouchers/[id]/journals error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
