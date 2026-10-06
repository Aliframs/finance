import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();

    const { id } = await params;
    
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "File wajib diunggah" }, { status: 400 });
    }

    // ─── Validasi tipe file ─────────────────────
    const ext = extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Tipe file "${ext}" tidak diizinkan. Hanya: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `MIME type "${file.type}" tidak diizinkan.` },
        { status: 400 }
      );
    }

    // ─── Validasi ukuran file ───────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal 10MB.` },
        { status: 400 }
      );
    }

    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // Temporary local storage inside public directory
    const uploadDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // ─── Nama file aman (UUID) ──────────────────
    const safeName = `${randomUUID()}${ext}`;
    const filepath = join(uploadDir, safeName);

    await writeFile(filepath, buffer);

    const attachmentUrl = `/uploads/${safeName}`;

    const attachment = await prisma.$transaction(async (tx) => {
      const created = await tx.attachment.create({
        data: {
          voucherId: id,
          originalName: file.name,
          filePath: attachmentUrl,
          uploaderId: user.id,
        }
      });

      await tx.auditLog.create({
        data: {
          voucherId: id,
          userId: user.id,
          action: "UPLOAD",
          notes: `Upload lampiran: ${file.name}`,
        }
      });

      return created;
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("POST /api/vouchers/[id]/attachments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
