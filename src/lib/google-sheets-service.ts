import { prisma } from "@/lib/db";

export async function sendToAppsScript(action: 'CREATE' | 'UPDATE' | 'DELETE', journalId: string) {
  try {
    const journal = await prisma.journal.findUnique({
      where: { id: journalId },
      include: { coa: true, voucher: { include: { vendor: true } } }
    });

    if (!journal) {
      console.error(`❌ Journal ${journalId} not found for sync`);
      return;
    }

    const fiscalYear = journal.fiscalYear || '2025';
    let webhookUrl = process.env.APPSCRIPT_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn(`Webhook URL is not set for fiscal year ${fiscalYear}. Skipping sync.`);
      return;
    }

    // Handle inconsistent tab naming (2025 is named "2025", 2026+ is "Jurnal YYYY")
    const sheetName = `Jurnal ${fiscalYear}`;

    const payload: any = { 
      action,
      secret: process.env.APPSCRIPT_SECRET || "default_secret_if_not_set",
      eventId: `${action}_${journalId}_${Date.now()}`,
      fiscalYear: fiscalYear,
      sheetName: sheetName
    };

    if (action === 'DELETE') {
      payload.journal = { id: journalId };
    } else {
      // For CREATE and UPDATE, we use the fetched journal data

      payload.journal = {
        id: journal.id,
        fiscalYear: fiscalYear,
        tanggal: `${journal.date.getDate().toString().padStart(2, '0')} ${journal.date.toLocaleString('en-GB', { month: 'short' })} ${journal.date.getFullYear().toString().slice(-2)}`,
        noVoucher: (journal.voucher.voucherNumber.toUpperCase().includes('PENDING') || journal.voucher.voucherNumber.toUpperCase().includes('TUNDA'))
          ? ""
          : `=HYPERLINK("${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/vouchers/${journal.voucher.id}", "${journal.voucher.voucherNumber}")`,
        noAkun: journal.coa.accountNumber,
        namaAkun: journal.coa.accountName,
        namaVendor: journal.voucher.vendor?.name || "-",
        keterangan: journal.description || "-",
        debit: journal.debit,
        credit: journal.credit,
        voucherUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/vouchers/${journal.voucher.id}`,
        voucherNumberPlain: journal.voucher.voucherNumber
      };
    }


    
        const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortController.signal
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();

    if (data && data.success) {
      await prisma.journal.update({
        where: { id: journalId },
        data: { syncStatus: 'SYNCED' }
      });

    } else {
      console.warn('Sync responded with success: false. Response:', data);
    }
  } catch (error) {
    console.error("❌ Apps Script Sync Error:", error);
  }
}
