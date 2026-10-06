import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";
import { notifyRole, getRoleForStatus } from "@/lib/notification-helper";

const createPOSchema = z.object({
  poNumber: z.string().min(1, "Nomor PO wajib diisi"),
  vendorId: z.string().min(1, "Vendor wajib dipilih"),
  picId: z.string().min(1, "PIC wajib dipilih"),
  date: z.string().optional(),
  items: z.array(
    z.object({
      type: z.enum(["BARANG", "JASA"]).optional().default("BARANG"),
      description: z.string().min(1, "Keterangan wajib diisi"),
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
});

export async function GET() {
  try {
    const user = await getAuthUser();

    const pos = await prisma.purchaseOrder.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        vendor: { select: { name: true } },
        pic: { select: { name: true } },
        items: true,
      },
    });
    return NextResponse.json(pos);
  } catch (error) {
    console.error("GET /api/po error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (user.role !== "ADMIN") return forbiddenResponse("Hanya Admin yang dapat membuat PO");

    const body = await req.json();
    const parsed = createPOSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.purchaseOrder.findUnique({
      where: { poNumber: data.poNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Nomor PO "${data.poNumber}" sudah digunakan` },
        { status: 409 }
      );
    }

    const po = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          poNumber: data.poNumber,
          vendorId: data.vendorId,
          picId: data.picId,
          date: data.date ? new Date(data.date) : new Date(),
          status: "DRAFT",
          // nominal field removed from PurchaseOrder
          discountPercentage: data.discountPercentage,
          ppnPercentage: data.ppnPercentage,
          pphPercentage: data.pphPercentage,
          grandTotal: data.grandTotal || data.items.reduce((acc, item) => acc + item.nominal, 0),
          items: {
            create: data.items,
          }
        },
        include: { vendor: true, pic: true },
      });

      await tx.purchaseOrderAuditLog.create({
        data: {
          purchaseOrderId: created.id,
          userId: user.id,
          action: "CREATE",
          notes: `PO ${created.poNumber} dibuat`,
        },
      });

      return created;
    });

    const targetRole = getRoleForStatus(po.status);
    if (targetRole) {
      await notifyRole(targetRole, "PO Baru", `Purchase Order ${po.poNumber} menunggu persetujuan Anda.`, `/po/${po.id}`);
    }

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    console.error("POST /api/po error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
