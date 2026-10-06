import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";

const coaSchema = z.object({
  accountNumber: z.string().min(1),
  accountName: z.string().min(1),
});

export async function GET() {
  try {
    const user = await getAuthUser();

    const coas = await prisma.masterCOA.findMany({
      orderBy: { accountNumber: "asc" },
    });
    return NextResponse.json(coas);
  } catch (error) {
    console.error("GET /api/coas error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (user.role !== "ADMIN") return forbiddenResponse("Hanya Admin yang dapat membuat COA");

    const body = await req.json();
    const parsed = coaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    const created = await prisma.masterCOA.create({ 
      data: { accountNumber: parsed.data.accountNumber, accountName: parsed.data.accountName } 
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/coas error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (user.role !== "ADMIN") return forbiddenResponse("Hanya Admin yang dapat mengedit COA");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const body = await req.json();
    const parsed = coaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const updated = await prisma.masterCOA.update({
      where: { id },
      data: { accountNumber: parsed.data.accountNumber, accountName: parsed.data.accountName },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/coas error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (user.role !== "ADMIN") return forbiddenResponse("Hanya Admin yang dapat menghapus COA");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    
    // Check referential integrity before delete
    const usedInJournals = await prisma.journal.count({ where: { coaId: id } });
    if (usedInJournals > 0) {
      return NextResponse.json(
        { error: `COA masih digunakan oleh ${usedInJournals} jurnal entry. Tidak bisa dihapus.` },
        { status: 409 }
      );
    }

    await prisma.masterCOA.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/coas error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
