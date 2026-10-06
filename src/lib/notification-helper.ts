import { prisma } from "@/lib/db";
import { UserRole } from "./workflow-engine";

export async function notifyRole(role: string, title: string, message: string, link: string) {
  try {
    const users = await prisma.user.findMany({ where: { role: role as UserRole } });
    if (users.length === 0) return;
    
    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        title,
        message,
        link
      }))
    });
  } catch (err) {
    console.error("Failed to notify role:", err);
  }
}

export function getRoleForStatus(status: string): string | null {
  const map: Record<string, string> = {
    'WAITING_ACCOUNTING_2': 'ACCOUNTING_2',
    'WAITING_ACCOUNTING_1': 'ACCOUNTING_1',
    'WAITING_ACCOUNTING_3': 'ACCOUNTING_3',
    'WAITING_FINANCE': 'FINANCE',
    'WAITING_DIRUT': 'DIREKTUR_UTAMA',
    'WAITING_DIREKTUR': 'DIREKTUR',
    'REVISION_VOUCHER': 'ADMIN',
    'REVISION_JOURNAL': 'ACCOUNTING_2',
  };
  return map[status] || null;
}
