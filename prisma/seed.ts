import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const defaultUsers = [
    { email: 'admin@finance.com', name: 'Admin Finance', role: 'ADMIN' },
    { email: 'acc1@finance.com', name: 'Rina (Accounting 1)', role: 'ACCOUNTING_1' },
    { email: 'acc2@finance.com', name: 'Sari (Accounting 2)', role: 'ACCOUNTING_2' },
    { email: 'acc3@finance.com', name: 'Budi (Accounting 3)', role: 'ACCOUNTING_3' },
    { email: 'finance@finance.com', name: 'Dian (Finance)', role: 'FINANCE' },
    { email: 'dirut@finance.com', name: 'Pak Hendra', role: 'DIREKTUR_UTAMA' },
    { email: 'direktur@finance.com', name: 'Bu Mega', role: 'DIREKTUR' },
  ];

  for (const u of defaultUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          ...u,
          password,
        },
      });
      console.log(`Created user: ${u.email}`);
    } else {
      console.log(`User already exists: ${u.email}`);
    }
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
