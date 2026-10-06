import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './utils';

// Helper for formatting period
const getPeriodText = (fiscalYear: string, start: string, end: string) => {
  if (start && end) return `Periode: ${start} s/d ${end}`;
  return `Tahun Fiskal: ${fiscalYear}`;
};

// Helper for formatting amount (0 becomes '-', negatives get parentheses)
const formatAmount = (amount: number, isDeduction: boolean = false) => {
  if (Math.abs(amount) < 0.01) return '-';
  // If it's explicitly marked as a deduction, make it negative so formatCurrency wraps it in ()
  const finalAmount = isDeduction ? -Math.abs(amount) : amount;
  return formatCurrency(finalAmount);
};

export interface EquityRow {
  label: string;
  modalSaham: number;
  oci: number;
  ditentukan: number;
  tidakDitentukan: number;
  isTotal: boolean;
}

export const exportTrialBalancePDF = (
  data: any[],
  fiscalYear: string,
  startDate: string,
  endDate: string
) => {
  const doc = new jsPDF('landscape');
  
  // Title
  doc.setFontSize(16);
  doc.text('Neraca Saldo (Trial Balance)', 14, 20);
  
  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(getPeriodText(fiscalYear, startDate, endDate), 14, 28);
  
  // Totals (Mathematically sums to 0 if balanced)
  const totalStarting = data.reduce((sum, item) => sum + item.startingBalance, 0);
  const totalDebit = data.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = data.reduce((sum, item) => sum + item.credit, 0);
  const totalEnding = data.reduce((sum, item) => sum + item.endingBalance, 0);

  // Table
  autoTable(doc, {
    startY: 35,
    head: [['No. Akun', 'Nama Akun', 'Kategori', 'Saldo Awal', 'Debit', 'Kredit', 'Saldo Akhir']],
    body: data.map(item => [
      item.accountNumber,
      item.accountName,
      item.category,
      formatAmount(item.startingBalance),
      formatAmount(item.debit),
      formatAmount(item.credit),
      formatAmount(item.endingBalance)
    ]),
    foot: [[
      { content: 'Total Keseluruhan', colSpan: 3, styles: { halign: 'right' } },
      formatAmount(totalStarting),
      formatAmount(totalDebit),
      formatAmount(totalCredit),
      formatAmount(totalEnding)
    ]],
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233] }, // Primary color
    footStyles: { fillColor: [241, 245, 249], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 70 },
      2: { cellWidth: 30 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' }
    },
    styles: { fontSize: 9 }
  });

  doc.save(`Trial_Balance_${fiscalYear}.pdf`);
};

export const exportCashFlowPDF = (
  data: any,
  fiscalYear: string,
  startDate: string,
  endDate: string
) => {
  const doc = new jsPDF('portrait');
  
  doc.setFontSize(16);
  doc.text('Laporan Arus Kas (Cash Flow)', 14, 20);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(getPeriodText(fiscalYear, startDate, endDate), 14, 28);

  const tableBody: any[] = [];
  
  const addRow = (name: string, amount: number, isTotal = false) => {
    if (isTotal) {
      tableBody.push([{ content: name, styles: { fontStyle: 'bold' } }, { content: formatAmount(amount), styles: { fontStyle: 'bold', halign: 'right' } }]);
    } else {
      // Direct method: negative cash flows are usually formatted with parentheses
      tableBody.push([name, { content: formatAmount(amount, amount < 0), styles: { halign: 'right' } }]);
    }
  };

  tableBody.push([{ content: 'Aktivitas Operasional', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }]);
  addRow('Pendapatan', data.pendapatan);
  addRow('(Pembayaran) ke pemasok dan karyawan', data.pembayaranPemasokKaryawan);
  addRow('Penerimaan (Pembayaran) Lainnya', data.penerimaanLainnya);
  addRow('Arus Kas Untuk Aktivitas Operasional', data.arusKasOperasional, true);
  tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]);

  tableBody.push([{ content: 'Aktivitas Investasi', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [255, 240, 245] } }]);
  addRow('Pembelian', data.pembelian);
  addRow('Pembelian Aset Tetap', data.pembelianAsetTetap);
  addRow('Arus Kas Untuk Investasi', data.arusKasInvestasi, true);
  tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]);

  tableBody.push([{ content: 'Aktivitas Pendanaan', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 255, 240] } }]);
  addRow('Pinjaman kepada Pemegang Saham', data.pinjamanPemegangSaham);
  addRow('Modal', data.modal);
  addRow('Modal yang belum disetor', data.modalBelumDisetor);
  addRow('Arus Kas Untuk Aktivitas Pendanaan', data.arusKasPendanaan, true);
  tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 10, fillColor: [255, 255, 255] } }]);

  tableBody.push([{ content: 'Kenaikan (Penurunan) Kas', styles: { fontStyle: 'bold' } }, { content: formatAmount(data.kenaikanKas, data.kenaikanKas < 0), styles: { fontStyle: 'bold', halign: 'right' } }]);
  tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]);

  tableBody.push(['Saldo Kas Awal Tahun', { content: formatAmount(data.saldoAwal), styles: { halign: 'right' } }]);
  tableBody.push([{ content: 'Saldo Kas Akhir Tahun', styles: { fontStyle: 'bold', fillColor: [224, 242, 254] } }, { content: formatAmount(data.saldoAkhir), styles: { fontStyle: 'bold', halign: 'right', fillColor: [224, 242, 254] } }]);

  autoTable(doc, {
    startY: 35,
    head: [['KETERANGAN', 'JUMLAH']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233] },
    columnStyles: {
      0: { cellWidth: 135 },
      1: { halign: 'right' }
    },
    styles: { fontSize: 9 }
  });

  doc.save(`Cash_Flow_${fiscalYear}.pdf`);
};

export const exportProfitLossPDF = (
  data: any,
  fiscalYear: string,
  startDate: string,
  endDate: string
) => {
  const doc = new jsPDF('portrait');
  
  doc.setFontSize(16);
  doc.text('Laporan Laba Rugi (Profit & Loss)', 14, 20);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(getPeriodText(fiscalYear, startDate, endDate), 14, 28);

  const tableBody: any[] = [];
  
  const addSummarySection = (title: string, items: any[], total: number) => {
    if (!items || items.length === 0) return;
    tableBody.push([{ content: title, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }]);
    items.forEach(item => {
      tableBody.push([item.name, formatAmount(item.amount)]);
    });
    tableBody.push([{ content: `JUMLAH ${title.toUpperCase()}`, styles: { fontStyle: 'bold', fontSize: 8 } }, { content: formatAmount(total), styles: { fontStyle: 'bold', halign: 'right' } }]);
    tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]); // Spacer
  };

  tableBody.push(['Pendapatan Usaha', { content: formatAmount(data.pendapatanUsaha), styles: { halign: 'right' } }]);
  tableBody.push(['Beban Pokok Penjualan', { content: formatAmount(data.bebanPokokPenjualan, true), styles: { halign: 'right' } }]);
  tableBody.push([{ content: 'PENDAPATAN KOTOR', styles: { fontStyle: 'bold', fillColor: [224, 242, 254] } }, { content: formatAmount(data.grossProfit), styles: { fontStyle: 'bold', halign: 'right', fillColor: [224, 242, 254] } }]);
  tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]); // Spacer
  
  addSummarySection("Beban Usaha", data.operatingExpenses, data.totalOperatingExpenses);
  addSummarySection("Pendapatan Lain Lain", data.pendapatanLain, data.totalPendapatanLain);
  addSummarySection("Beban Lain Lain", data.bebanLain, data.totalBebanLain);

  tableBody.push([{ content: 'BEBAN PAJAK MASA KINI', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: formatAmount(data.bebanPajakMasaKini), styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249] } }]);
  tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]); // Spacer

  autoTable(doc, {
    startY: 35,
    head: [['KETERANGAN', 'JUMLAH']],
    body: tableBody,
    foot: [[
      { content: 'LABA (RUGI)', styles: { fontStyle: 'bold' } },
      formatAmount(data.netIncome)
    ]],
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233] },
    footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', halign: 'right' },
    columnStyles: {
      0: { cellWidth: 135 },
      1: { halign: 'right' }
    },
    styles: { fontSize: 9 }
  });

  doc.save(`Profit_Loss_${fiscalYear}.pdf`);
};

export const exportEquityToPDF = (
  rows: EquityRow[],
  fiscalYear: string
) => {
  // Use landscape for Equity because it has many columns
  const doc = new jsPDF('landscape');
  
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PT. XYZ', doc.internal.pageSize.width / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('LAPORAN PERUBAHAN EKUITAS', doc.internal.pageSize.width / 2, 22, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Untuk Tahun yang Berakhir 31 Desember ${fiscalYear}`, doc.internal.pageSize.width / 2, 28, { align: 'center' });

  // Prepare table data
  const tableData = rows.map(row => {
    const total = row.modalSaham + row.oci + row.ditentukan + row.tidakDitentukan;
    return [
      row.label,
      formatCurrency(row.modalSaham),
      formatCurrency(row.oci),
      formatCurrency(row.ditentukan),
      formatCurrency(row.tidakDitentukan),
      formatCurrency(total)
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [[
      'Keterangan', 
      'Modal Saham', 
      'Penghasilan Komprehensif Lain', 
      'Saldo Laba Ditentukan', 
      'Saldo Laba Tidak Ditentukan', 
      'Jumlah Ekuitas'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: 255,
      halign: 'center',
      valign: 'middle',
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } // Bold for total column
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    didParseCell: function (data) {
      // Bold the total row
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249]; // Slate 100
      }
    }
  });

  // add footer for landscape
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(150);
    const dateStr = new Date().toLocaleString('id-ID');
    doc.text(`Dicetak pada: ${dateStr}`, 14, doc.internal.pageSize.height - 10);
    doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
  }

  doc.save(`Laporan_Perubahan_Ekuitas_${fiscalYear}.pdf`);
};

export const exportBalanceSheetPDF = (
  data: any,
  fiscalYear: string,
  startDate: string,
  endDate: string
) => {
  const doc = new jsPDF('portrait');
  
  doc.setFontSize(16);
  doc.text('Neraca (Balance Sheet)', 14, 20);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(getPeriodText(fiscalYear, startDate, endDate), 14, 28);

  const tableBody: any[] = [];
  
  const addSummarySection = (title: string, items: any[], total: number) => {
    if (!items || items.length === 0) return;
    tableBody.push([{ content: title, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }]);
    items.forEach(item => {
      tableBody.push([item.name, formatAmount(item.amount)]);
    });
    tableBody.push([{ content: `JUMLAH ${title.toUpperCase()}`, styles: { fontStyle: 'bold', fontSize: 8 } }, { content: formatAmount(total), styles: { fontStyle: 'bold', halign: 'right' } }]);
    tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]);
  };

  // Assets
  tableBody.push([{ content: 'AKTIVA (ASSETS)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center', fillColor: [226, 232, 240] } }]);
  addSummarySection("AKTIVA LANCAR", data.assets.current, data.assets.current.reduce((a:any,b:any) => a + b.amount, 0));
  addSummarySection("AKTIVA TIDAK LANCAR", data.assets.nonCurrent, data.assets.nonCurrent.reduce((a:any,b:any) => a + b.amount, 0));
  tableBody.push([{ content: 'JUMLAH AKTIVA', styles: { fontStyle: 'bold', fillColor: [209, 250, 229] } }, { content: formatAmount(data.assets.total), styles: { fontStyle: 'bold', halign: 'right', fillColor: [209, 250, 229] } }]);
  
  tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 10, fillColor: [255, 255, 255] } }]);

  // Liabilities
  tableBody.push([{ content: 'KEWAJIBAN & EKUITAS', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center', fillColor: [226, 232, 240] } }]);
  addSummarySection("KEWAJIBAN LANCAR", data.liabilities.current, data.liabilities.current.reduce((a:any,b:any) => a + b.amount, 0));
  addSummarySection("KEWAJIBAN JANGKA PANJANG", data.liabilities.nonCurrent, data.liabilities.nonCurrent.reduce((a:any,b:any) => a + b.amount, 0));
  tableBody.push([{ content: 'JUMLAH KEWAJIBAN', styles: { fontStyle: 'bold' } }, { content: formatAmount(data.liabilities.total), styles: { fontStyle: 'bold', halign: 'right' } }]);
  
  tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]);

  // Equity
  tableBody.push([{ content: 'EKUITAS', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }]);
  data.equity.items.forEach((item: any) => {
    tableBody.push([item.name, formatAmount(item.amount)]);
  });
  tableBody.push(['Laba (Rugi) Tahun Berjalan', { content: formatAmount(data.equity.currentYearEarnings), styles: { halign: 'right' } }]);
  tableBody.push([{ content: 'JUMLAH EKUITAS', styles: { fontStyle: 'bold', fontSize: 8 } }, { content: formatAmount(data.equity.total), styles: { fontStyle: 'bold', halign: 'right' } }]);

  tableBody.push([{ content: '', colSpan: 2, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]);

  tableBody.push([{ content: 'JUMLAH KEWAJIBAN & EKUITAS', styles: { fontStyle: 'bold', fillColor: [224, 242, 254] } }, { content: formatAmount(data.totalLiabilitiesAndEquity), styles: { fontStyle: 'bold', halign: 'right', fillColor: [224, 242, 254] } }]);

  autoTable(doc, {
    startY: 35,
    head: [['KETERANGAN', 'JUMLAH']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233] },
    columnStyles: {
      0: { cellWidth: 135 },
      1: { halign: 'right' }
    },
    styles: { fontSize: 9 }
  });

  doc.save(`Balance_Sheet_${fiscalYear}.pdf`);
};

export const exportFiscalAdjustmentPDF = (
  data: any,
  fiscalYear: string,
  startDate: string,
  endDate: string
) => {
  const doc = new jsPDF('landscape');
  
  doc.setFontSize(16);
  doc.text('Koreksi Fiskal', 14, 20);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(getPeriodText(fiscalYear, startDate, endDate), 14, 28);

  const tableBody: any[] = [];

  const getFiscalAmount = (item: { amount: number, koreksiPositif: number, koreksiNegatif: number }, isExpense: boolean = false) => {
      if (isExpense) {
          return item.amount - item.koreksiPositif + item.koreksiNegatif;
      } else {
          return item.amount + item.koreksiPositif - item.koreksiNegatif;
      }
  };

  const calcTotal = (items: any[]) => {
      let comm = 0; let pos = 0; let neg = 0;
      items.forEach(i => { comm += i.amount; pos += i.koreksiPositif; neg += i.koreksiNegatif; });
      return { amount: comm, koreksiPositif: pos, koreksiNegatif: neg };
  };

  const addRow = (name: string, item: any, isExpense: boolean = false, isFinal: boolean = false, isBold: boolean = false, bgColor?: number[]) => {
      const fiscal = getFiscalAmount(item, isExpense);
      const displayFinal = isFinal ? -item.koreksiNegatif : null;
      const displayNegatif = isFinal ? 0 : item.koreksiNegatif;
      
      const styles: any = { fontStyle: isBold ? 'bold' : 'normal' };
      if (bgColor) styles.fillColor = bgColor;
      
      tableBody.push([
          { content: name, styles },
          { content: displayFinal !== null ? formatAmount(displayFinal) : '', styles: { ...styles, halign: 'center' } },
          { content: formatAmount(item.amount), styles: { ...styles, halign: 'right' } },
          { content: '', styles: { ...styles, halign: 'right' } },
          { content: formatAmount(displayNegatif), styles: { ...styles, halign: 'right' } },
          { content: formatAmount(item.koreksiPositif), styles: { ...styles, halign: 'right' } },
          { content: formatAmount(fiscal), styles: { ...styles, halign: 'right' } }
      ]);
  };

  const addGroup = (title: string, items: any[], isExpense: boolean) => {
      if (!items || items.length === 0) return;
      tableBody.push([{ content: title, colSpan: 7, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }]);
      items.forEach(item => {
          addRow(item.name, item, isExpense, item.name === 'Pendapatan Jasa Giro');
      });
      const t = calcTotal(items);
      const fiscal = getFiscalAmount(t, isExpense);
      tableBody.push([
          { content: `JUMLAH ${title}`, styles: { fontStyle: 'bold', fontSize: 8, fillColor: [248, 250, 252] } },
          { content: '', styles: { fillColor: [248, 250, 252] } },
          { content: '', styles: { fillColor: [248, 250, 252] } },
          { content: formatAmount(t.amount), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
          { content: formatAmount(t.koreksiNegatif), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
          { content: formatAmount(t.koreksiPositif), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
          { content: formatAmount(fiscal), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } }
      ]);
      tableBody.push([{ content: '', colSpan: 7, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]);
  };

  addRow('Pendapatan Usaha', data.pendapatanUsaha, false);
  addRow('Beban Pokok Penjualan', data.bebanPokokPenjualan, true);
  
  const gpPos = data.pendapatanUsaha.koreksiPositif - data.bebanPokokPenjualan.koreksiPositif;
  const gpNeg = data.pendapatanUsaha.koreksiNegatif - data.bebanPokokPenjualan.koreksiNegatif;
  const gpFiscal = getFiscalAmount(data.pendapatanUsaha, false) - getFiscalAmount(data.bebanPokokPenjualan, true);
  
  tableBody.push([
      { content: 'PENDAPATAN KOTOR', styles: { fontStyle: 'bold', fillColor: [224, 242, 254] } },
      { content: '', styles: { fillColor: [224, 242, 254] } },
      { content: '', styles: { fillColor: [224, 242, 254] } },
      { content: formatAmount(data.grossProfit), styles: { fontStyle: 'bold', halign: 'right', fillColor: [224, 242, 254] } },
      { content: formatAmount(gpNeg), styles: { fontStyle: 'bold', halign: 'right', fillColor: [224, 242, 254] } },
      { content: formatAmount(gpPos), styles: { fontStyle: 'bold', halign: 'right', fillColor: [224, 242, 254] } },
      { content: formatAmount(gpFiscal), styles: { fontStyle: 'bold', halign: 'right', fillColor: [224, 242, 254] } }
  ]);
  tableBody.push([{ content: '', colSpan: 7, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]);

  addGroup('BEBAN USAHA', data.operatingExpenses, true);
  addGroup('PENDAPATAN LAIN LAIN', data.pendapatanLain, false);
  addGroup('BEBAN LAIN LAIN', data.bebanLain, true);

  const lspComm = data.grossProfit - data.totalOperatingExpenses + data.totalPendapatanLain - data.totalBebanLain;
  const tPosLsp = data.pendapatanUsaha.koreksiPositif + calcTotal(data.operatingExpenses).koreksiPositif + calcTotal(data.pendapatanLain).koreksiPositif + calcTotal(data.bebanLain).koreksiPositif;
  const tNegLsp = data.pendapatanUsaha.koreksiNegatif + calcTotal(data.operatingExpenses).koreksiNegatif + calcTotal(data.pendapatanLain).koreksiNegatif + calcTotal(data.bebanLain).koreksiNegatif;
  
  tableBody.push([
      { content: 'LABA (RUGI) SEBELUM PAJAK', styles: { fontStyle: 'bold', fillColor: [224, 242, 254] } },
      { content: '', styles: { fillColor: [224, 242, 254] } },
      { content: '', styles: { fillColor: [224, 242, 254] } },
      { content: formatAmount(lspComm), styles: { fontStyle: 'bold', halign: 'right', fillColor: [224, 242, 254] } },
      { content: '', colSpan: 2, styles: { fillColor: [224, 242, 254] } },
      { content: formatAmount(lspComm + tPosLsp - tNegLsp), styles: { fontStyle: 'bold', halign: 'right', fillColor: [224, 242, 254] } }
  ]);
  
  tableBody.push([{ content: '', colSpan: 7, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]);

  addRow('Beban Pajak', data.bebanPajakMasaKini, true, false, true, [241, 245, 249]);

  const nbComm = data.netIncome;
  const tPosNb = tPosLsp + data.bebanPajakMasaKini.koreksiPositif;
  const tNegNb = tNegLsp + data.bebanPajakMasaKini.koreksiNegatif;

  tableBody.push([{ content: '', colSpan: 7, styles: { minCellHeight: 5, fillColor: [255, 255, 255] } }]);

  tableBody.push([
      { content: 'Laba (Rugi) Bersih Setelah Pajak Disetahunkan', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [15, 23, 42], textColor: 255 } },
      { content: formatAmount(nbComm), styles: { fontStyle: 'bold', halign: 'right', fillColor: [15, 23, 42], textColor: 255 } },
      { content: '', colSpan: 2, styles: { fillColor: [15, 23, 42] } },
      { content: formatAmount(nbComm + tPosNb - tNegNb), styles: { fontStyle: 'bold', halign: 'right', fillColor: [15, 23, 42], textColor: 255 } }
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['KETERANGAN', 'FINAL', 'AMOUNT', 'JUMLAH', 'NEGATIF', 'POSITIF', 'MENURUT FISKAL']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233], halign: 'center' },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 35, halign: 'right' }
    },
    styles: { fontSize: 8, cellPadding: 2 }
  });

  doc.save(`Koreksi_Fiskal_${fiscalYear}.pdf`);
};

