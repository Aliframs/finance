import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";
import { notifyRole, getRoleForStatus } from "@/lib/notification-helper";

const createVoucherSchema = z.object({
  voucherNumber: z.string().min(1, "Nomor voucher wajib diisi"),
  vendorId: z.string().min(1, "Vendor wajib dipilih"),
  fiscalYear: z.string().min(4, "Tahun buku wajib dipilih"),
  type: z.enum(["PENGELUARAN", "PEMASUKAN"]).default("PENGELUARAN"),
  date: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1, "Keterangan wajib diisi"),
      type: z.enum(["BARANG", "JASA"]).optional().default("BARANG"),
      unit: z.string().optional().default("pcs"),
      qty: z.number().min(1, "Qty wajib diisi"),
      price: z.number().optional().default(0),
      nominal: z.number({ invalid_type_error: "Nominal harus angka valid" })
    })
  ).min(1, "Minimal 1 item wajib diisi"),
  nominal: z.number().optional().default(0),
  discountPercentage: z.number().optional().default(0),
  ppnPercentage: z.number().optional().default(0),
  pphPercentage: z.number().optional().default(0),
  grandTotal: z.number().optional().default(0),
  remarks: z.string().optional(),
});

// GET — List all vouchers
export async function GET() {
  try {
    const user = await getAuthUser();

    const vouchers = await prisma.voucher.findMany({
      orderBy: { voucherNumber: "desc" },
      include: {
        vendor: { select: { name: true, bankName: true } },
        items: true,
        _count: { select: { attachments: true, journals: true } },
      },
    });

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error("GET /api/vouchers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — Create new voucher (Admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (user.role !== "ADMIN") return forbiddenResponse("Hanya Admin yang dapat membuat voucher");

    const body = await req.json();
    const parsed = createVoucherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check uniqueness of voucher number
    const existing = await prisma.voucher.findUnique({
      where: { voucherNumber: data.voucherNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Nomor voucher "${data.voucherNumber}" sudah digunakan` },
        { status: 409 }
      );
    }

    // Get vendor details for auto-fill
    const vendor = await prisma.masterVendor.findUnique({
      where: { id: data.vendorId },
    });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor tidak ditemukan" }, { status: 404 });
    }

    const voucher = await prisma.$transaction(async (tx) => {
      const created = await tx.voucher.create({
        data: {
          voucherNumber: data.voucherNumber,
          vendorId: data.vendorId,
          bankName: vendor.bankName,
          accountNumber: vendor.accountNumber,
          accountName: vendor.accountName,
          fiscalYear: data.fiscalYear,
          date: data.date ? new Date(data.date) : new Date(),
          type: data.type,
          nominal: data.nominal || data.items.reduce((acc, item) => acc + item.nominal, 0),
          discountPercentage: data.discountPercentage,
          ppnPercentage: data.ppnPercentage,
          pphPercentage: data.pphPercentage,
          grandTotal: data.grandTotal || data.items.reduce((acc, item) => acc + item.nominal, 0),
          status: "WAITING_ACCOUNTING_2", // PRD: Admin -> Acc 2
          items: {
            create: data.items,
          }
        },
        include: { vendor: true },
      });

      // Create audit log — use the ACTUAL logged-in user
      await tx.auditLog.create({
        data: {
          voucherId: created.id,
          userId: user.id,
          action: "CREATE",
          notes: `Voucher ${created.voucherNumber} dibuat`,
        },
      });

      return created;
    });

    const targetRole = getRoleForStatus(voucher.status);
    if (targetRole) {
      await notifyRole(targetRole, "Voucher Baru", `Voucher ${voucher.voucherNumber} menunggu persetujuan Anda.`, `/vouchers/${voucher.id}`);
    }

    return NextResponse.json(voucher, { status: 201 });
  } catch (error) {
    console.error("POST /api/vouchers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
