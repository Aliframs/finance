import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getAuthUser();

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false }
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();

    const body = await req.json();
    const { action, id } = body;

    if (action === "MARK_ALL_READ") {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true });
    }

    if (action === "MARK_READ" && id) {
      await prisma.notification.update({
        where: { id, userId: user.id },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
