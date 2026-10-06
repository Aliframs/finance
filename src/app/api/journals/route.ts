import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();

    const journals = await prisma.journal.findMany({
      include: {
        coa: true,
        voucher: {
          select: {
            voucherNumber: true,
            date: true,
          }
        }
      },
      orderBy: {
        voucher: {
          date: 'desc'
        }
      }
    });

    return NextResponse.json(journals);
  } catch (error) {
    console.error("GET /api/journals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
