import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Helper: mendapatkan session yang terautentikasi.
 * Mengembalikan session.user jika login, atau null jika belum.
 */
export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.email || !session?.user?.role) {
    throw new Error("Unauthorized");
  }
  
  // Ambil user asli dari DB untuk menghindari stale ID dari cookie (foreign key error)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  });
  
  if (!dbUser) throw new Error("Unauthorized");
  
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
  };
}

/**
 * Helper: memvalidasi bahwa user sudah login.
 * Mengembalikan NextResponse 401 jika belum login.
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized: Anda harus login terlebih dahulu" },
    { status: 401 }
  );
}

/**
 * Helper: memvalidasi bahwa user punya role yang diizinkan.
 * Mengembalikan NextResponse 403 jika tidak diizinkan.
 */
export function forbiddenResponse(message?: string) {
  return NextResponse.json(
    { error: message || "Forbidden: Anda tidak memiliki izin untuk aksi ini" },
    { status: 403 }
  );
}
