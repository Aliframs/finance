import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getAuthUser();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
