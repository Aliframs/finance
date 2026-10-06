import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";

const vendorSchema = z.object({
  name: z.string().min(1),
  bankName: z.string().optional().transform(v => v || ""),
  accountNumber: z.string().optional().transform(v => v || ""),
  accountName: z.string().optional().transform(v => v || ""),
  address: z.string().optional(),
  npwp: z.string().optional(),
  nik: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getAuthUser();

    const vendors = await prisma.masterVendor.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(vendors);
  } catch (error) {
    console.error("GET /api/vendors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (user.role !== "ADMIN") return forbiddenResponse("Hanya Admin yang dapat membuat vendor");

    const body = await req.json();
    const parsed = vendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    const created = await prisma.masterVendor.create({ data: parsed.data });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/vendors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (user.role !== "ADMIN") return forbiddenResponse("Hanya Admin yang dapat mengedit vendor");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const body = await req.json();
    const parsed = vendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const updated = await prisma.masterVendor.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/vendors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (user.role !== "ADMIN") return forbiddenResponse("Hanya Admin yang dapat menghapus vendor");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    
    // Check referential integrity before delete
    const usedInVouchers = await prisma.voucher.findMany({ where: { vendorId: id }, select: { voucherNumber: true } });
    if (usedInVouchers.length > 0) {
      const vNumbers = usedInVouchers.map(v => v.voucherNumber).join(', ');
      return NextResponse.json(
        { error: `Vendor masih digunakan oleh voucher: ${vNumbers}. Silakan ubah vendor pada voucher tersebut terlebih dahulu sebelum menghapus.` },
        { status: 409 }
      );
    }
    
    const usedInPOs = await prisma.purchaseOrder.findMany({ where: { vendorId: id }, select: { poNumber: true } });
    if (usedInPOs.length > 0) {
      const poNumbers = usedInPOs.map(po => po.poNumber).join(', ');
      return NextResponse.json(
        { error: `Vendor masih digunakan oleh PO: ${poNumbers}. Silakan ubah vendor pada PO tersebut terlebih dahulu sebelum menghapus.` },
        { status: 409 }
      );
    }

    await prisma.masterVendor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/vendors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
