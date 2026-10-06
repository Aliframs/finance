import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getNextPOStatus, canApprovePO, canRejectPO } from "@/lib/po-workflow-engine";
import { z } from "zod";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";
import { notifyRole, getRoleForStatus } from "@/lib/notification-helper";

const poActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "CANCEL", "NOTE"]),
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
    const parsed = poActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, notes } = parsed.data;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { pic: true }
    });

    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    const isPIC = po.picId === user.id;
    let newStatus = po.status;

    if (action === "APPROVE") {
      // ─── Server-side authorization check ───────
      if (!canApprovePO(po.status, user.role, isPIC)) {
        return forbiddenResponse("Anda tidak memiliki izin untuk menyetujui PO ini");
      }
      newStatus = getNextPOStatus(po.status);
    } else if (action === "REJECT") {
      if (!canRejectPO(po.status, user.role, isPIC)) {
        return forbiddenResponse("Anda tidak memiliki izin untuk menolak PO ini");
      }
      newStatus = "REJECTED";
    } else if (action === "CANCEL") {
      if (user.role !== "ADMIN") {
        return forbiddenResponse("Hanya Admin yang dapat membatalkan PO");
      }
      newStatus = "CANCELLED";
    } else if (action === "NOTE") {
      // Status doesn't change, just add audit log
    }

    const updated = await prisma.$transaction(async (tx) => {
      let result = po;
      
      if (newStatus !== po.status) {
        result = await tx.purchaseOrder.update({
          where: { id },
          data: { status: newStatus },
          include: { pic: true }
        });
      }

      await tx.purchaseOrderAuditLog.create({
        data: {
          purchaseOrderId: id,
          userId: user.id,
          action: action,
          notes: notes || null,
          oldValue: po.status,
          newValue: newStatus,
        },
      });

      return result;
    });

    if (newStatus !== po.status) {
      if (newStatus === "REJECTED") {
        await notifyRole('ADMIN', "PO Ditolak", `Purchase Order ${po.poNumber} telah ditolak.`, `/po/${id}`);
      } else {
        const targetRole = getRoleForStatus(newStatus);
        if (targetRole) {
          await notifyRole(targetRole, "PO Approved", `Purchase Order ${po.poNumber} telah di-approve dan menunggu tindakan Anda.`, `/po/${id}`);
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("POST /api/po/[id]/action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
