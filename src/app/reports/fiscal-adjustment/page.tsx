'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, PenTool, Loader2, Download } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { exportFiscalAdjustmentPDF } from '@/lib/pdf-export';

interface SummaryItem {
  name: string;
  amount: number;
  koreksiPositif: number;
  koreksiNegatif: number;
}

interface ItemData {
  amount: number;
  koreksiPositif: number;
  koreksiNegatif: number;
}

interface PnlData {
  pendapatanUsaha: ItemData;
  bebanPokokPenjualan: ItemData;
  grossProfit: number;
  operatingExpenses: SummaryItem[];
  totalOperatingExpenses: number;
  pendapatanLain: SummaryItem[];
  totalPendapatanLain: number;
  bebanLain: SummaryItem[];
  totalBebanLain: number;
  bebanPajakMasaKini: ItemData;
  netIncome: number;
}

export default function FiscalAdjustmentPage() {
  const [fiscalYear, setFiscalYear] = useState('2025');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<PnlData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `/api/reports/profit-loss?fiscalYear=${fiscalYear}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;

        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch fiscal adjustment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fiscalYear, startDate, endDate]);

  const handlePrint = () => {
    exportFiscalAdjustmentPDF(data as any, fiscalYear, startDate, endDate);
  };

  const renderAmount = (amount: number, colorClass?: string) => {
    if (Math.abs(amount) < 0.01) return <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>;
    return <span className={`font-mono tracking-tight ${colorClass || ''}`}>{formatCurrency(amount)}</span>;
  };

  const getFiscalAmount = (item: { amount: number, koreksiPositif: number, koreksiNegatif: number }, isExpense: boolean = false) => {
      // Fiscal = Commercial + Positif - Negatif
      // But for expenses, maybe it's different? Positif means adding to fiscal income (so reducing expense), Negatif means reducing fiscal income (adding to expense).
      // Standard: Laba Fiskal = Laba Komersial + Koreksi Positif - Koreksi Negatif
      // If the row is an expense (e.g. Beban), increasing the expense DECREASES the profit.
      // So if we have Koreksi Positif (adds to profit), it means we are REDUCING the expense.
      // If we have Koreksi Negatif (reduces profit), it means we are INCREASING the expense.
      // Therefore, Beban Fiskal = Beban Komersial - Positif + Negatif
      // Revenue Fiskal = Revenue Komersial + Positif - Negatif
      
      if (isExpense) {
          return item.amount - item.koreksiPositif + item.koreksiNegatif;
      } else {
          return item.amount + item.koreksiPositif - item.koreksiNegatif;
      }
  };

  const renderItemRow = (name: string, item: { amount: number, koreksiPositif: number, koreksiNegatif: number }, isExpense: boolean = false, isFinal: boolean = false) => {
    const fiscalAmount = getFiscalAmount(item, isExpense);
    
    // For Final items (Pendapatan Jasa Giro), the user's Excel puts the correction in the FINAL column and sets Fiskal to -
    const displayFinal = isFinal ? -item.koreksiNegatif : 0;
    const displayNegatif = isFinal ? 0 : item.koreksiNegatif;

    return (
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <td className="py-2 pl-4 font-medium text-sm text-slate-700 dark:text-slate-300">{name}</td>
        <td className="text-center py-2 text-sm text-slate-500">{isFinal ? renderAmount(displayFinal, 'text-rose-600') : ''}</td>
        <td className="text-right py-2 pr-4">{renderAmount(item.amount, isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}</td>
        <td className="text-right py-2 pr-4"></td>
        <td className="text-right py-2 pr-4">{renderAmount(displayNegatif)}</td>
        <td className="text-right py-2 pr-4">{renderAmount(item.koreksiPositif)}</td>
        <td className="text-right py-2 pr-4 font-bold">{renderAmount(fiscalAmount, isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}</td>
      </tr>
    );
  };

  const renderSummaryRows = (items: SummaryItem[], isExpense = false) => {
    if (!items || items.length === 0) return null;
    return items.map((item, idx) => {
        // Special case: Pendapatan Jasa Giro is usually subject to Final Tax
        const isFinal = item.name === 'Pendapatan Jasa Giro';
        return renderItemRow(item.name, item, isExpense, isFinal);
    });
  };

  const calcTotal = (items: SummaryItem[]) => {
      let comm = 0; let pos = 0; let neg = 0;
      items.forEach(i => { comm += i.amount; pos += i.koreksiPositif; neg += i.koreksiNegatif; });
      return { amount: comm, koreksiPositif: pos, koreksiNegatif: neg };
  };

  return (
    <div className="p-4 md:p-8 w-full space-y-6">
      
      <div className="flex items-center justify-between mb-4 print-hide">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="btn btn-secondary btn-sm" style={{ padding: '0.5rem', borderRadius: 'var(--radius-full)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PenTool className="text-primary" /> Koreksi Fiskal
            </h1>
            <p className="text-muted-foreground text-sm">Penyesuaian untuk pelaporan pajak (Komersial vs Fiskal).</p>
          </div>
        </div>
        <button onClick={handlePrint} className="btn btn-primary" disabled={!data}>
          <Download size={16} /> Export PDF
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="print-hide p-4 flex flex-wrap gap-4 items-center justify-between border-b border-border bg-slate-50/50 dark:bg-slate-800/30">
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.1)', padding: '0.25rem', borderRadius: 'var(--radius-full)' }}>
            <button className={`btn ${fiscalYear === '2025' ? 'btn-primary' : ''}`} style={{ padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-full)', background: fiscalYear === '2025' ? 'var(--primary)' : 'transparent', color: fiscalYear === '2025' ? 'white' : 'var(--text-muted)', border: 'none', boxShadow: 'none', fontWeight: 600 }} onClick={() => setFiscalYear('2025')}>Tahun 2025</button>
            <button className={`btn ${fiscalYear === '2026' ? 'btn-primary' : ''}`} style={{ padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-full)', background: fiscalYear === '2026' ? 'var(--primary)' : 'transparent', color: fiscalYear === '2026' ? 'white' : 'var(--text-muted)', border: 'none', boxShadow: 'none', fontWeight: 600 }} onClick={() => setFiscalYear('2026')}>Tahun 2026</button>
          </div>
          <DateRangeFilter onFilter={(start, end) => { setStartDate(start); setEndDate(end); }} />
        </div>

        <div className="p-8">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Loader2 className="animate-spin mb-4 opacity-50" size={40} />
            <p>Memuat Koreksi Fiskal...</p>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-muted-foreground">Tidak ada data.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] data-table table-fixed">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                  <th className="text-left font-bold py-3 pl-4 w-[28%]">KETERANGAN</th>
                  <th className="text-center font-bold py-3 w-[8%]">FINAL</th>
                  <th className="text-right font-bold py-3 pr-4 w-[13%]">AMOUNT</th>
                  <th className="text-right font-bold py-3 pr-4 w-[13%]">JUMLAH</th>
                  <th className="text-right font-bold py-3 pr-4 w-[11%]">NEGATIF</th>
                  <th className="text-right font-bold py-3 pr-4 w-[11%]">POSITIF</th>
                  <th className="text-right font-bold py-3 pr-4 w-[16%]">MENURUT FISKAL</th>
                </tr>
              </thead>
              <tbody>
                
                {/* 1. Pendapatan Usaha & HPP */}
                {renderItemRow('Pendapatan Usaha', data.pendapatanUsaha, false)}
                {renderItemRow('Beban Pokok Penjualan', data.bebanPokokPenjualan, true)}
                
                {/* Laba Kotor */}
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-bold text-sm border-y border-slate-200 dark:border-slate-700">
                  <td className="py-3 pl-4 uppercase text-slate-800 dark:text-slate-200 tracking-wide">PENDAPATAN KOTOR</td>
                  <td className="text-center"></td>
                  <td className="text-right"></td>
                  <td className="text-right py-3 pr-4 text-slate-800 dark:text-slate-200">{renderAmount(data.grossProfit)}</td>
                  <td className="text-right py-3 pr-4">{renderAmount(data.pendapatanUsaha.koreksiNegatif - data.bebanPokokPenjualan.koreksiNegatif)}</td>
                  <td className="text-right py-3 pr-4">{renderAmount(data.pendapatanUsaha.koreksiPositif - data.bebanPokokPenjualan.koreksiPositif)}</td>
                  <td className="text-right py-3 pr-4">{renderAmount(getFiscalAmount(data.pendapatanUsaha, false) - getFiscalAmount(data.bebanPokokPenjualan, true))}</td>
                </tr>

                {/* 2. Beban Usaha */}
                <tr><td colSpan={7} className="h-4 border-none"></td></tr>
                <tr><td colSpan={7} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-primary px-4 py-2 uppercase tracking-wider">BEBAN USAHA</td></tr>
                
                {renderSummaryRows(data.operatingExpenses, true)}
                
                <tr className="border-y border-slate-200 dark:border-slate-700 font-bold bg-slate-50/30 dark:bg-slate-800/10">
                  <td className="text-left py-3 pl-4 uppercase text-[11px] tracking-widest text-slate-600 dark:text-slate-300">JUMLAH BEBAN USAHA</td>
                  <td colSpan={2}></td>
                  <td className="text-right py-3 pr-4 text-rose-600 dark:text-rose-400">{renderAmount(data.totalOperatingExpenses)}</td>
                  <td className="text-right py-3 pr-4">{renderAmount(calcTotal(data.operatingExpenses).koreksiNegatif)}</td>
                  <td className="text-right py-3 pr-4">{renderAmount(calcTotal(data.operatingExpenses).koreksiPositif)}</td>
                  <td className="text-right py-3 pr-4 text-rose-600 dark:text-rose-400">{renderAmount(getFiscalAmount(calcTotal(data.operatingExpenses), true))}</td>
                </tr>
                
                {/* 3. Pendapatan Lain Lain */}
                <tr><td colSpan={7} className="h-4 border-none"></td></tr>
                <tr><td colSpan={7} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-primary px-4 py-2 uppercase tracking-wider">PENDAPATAN LAIN LAIN</td></tr>
                
                {renderSummaryRows(data.pendapatanLain, false)}
                
                <tr className="border-y border-slate-200 dark:border-slate-700 font-bold bg-slate-50/30 dark:bg-slate-800/10">
                  <td className="text-left py-3 pl-4 uppercase text-[11px] tracking-widest text-slate-600 dark:text-slate-300">JUMLAH PENDAPATAN LAIN LAIN</td>
                  <td colSpan={2}></td>
                  <td className="text-right py-3 pr-4 text-emerald-600 dark:text-emerald-400">{renderAmount(data.totalPendapatanLain)}</td>
                  <td className="text-right py-3 pr-4">{renderAmount(calcTotal(data.pendapatanLain).koreksiNegatif)}</td>
                  <td className="text-right py-3 pr-4">{renderAmount(calcTotal(data.pendapatanLain).koreksiPositif)}</td>
                  <td className="text-right py-3 pr-4 text-emerald-600 dark:text-emerald-400">{renderAmount(getFiscalAmount(calcTotal(data.pendapatanLain), false))}</td>
                </tr>

                {/* 4. Beban Lain Lain */}
                <tr><td colSpan={7} className="h-4 border-none"></td></tr>
                <tr><td colSpan={7} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-primary px-4 py-2 uppercase tracking-wider">BEBAN LAIN LAIN</td></tr>
                
                {renderSummaryRows(data.bebanLain, true)}
                
                <tr className="border-y border-slate-200 dark:border-slate-700 font-bold bg-slate-50/30 dark:bg-slate-800/10">
                  <td className="text-left py-3 pl-4 uppercase text-[11px] tracking-widest text-slate-600 dark:text-slate-300">JUMLAH BEBAN LAIN LAIN</td>
                  <td colSpan={2}></td>
                  <td className="text-right py-3 pr-4 text-rose-600 dark:text-rose-400">{renderAmount(data.totalBebanLain)}</td>
                  <td className="text-right py-3 pr-4">{renderAmount(calcTotal(data.bebanLain).koreksiNegatif)}</td>
                  <td className="text-right py-3 pr-4">{renderAmount(calcTotal(data.bebanLain).koreksiPositif)}</td>
                  <td className="text-right py-3 pr-4 text-rose-600 dark:text-rose-400">{renderAmount(getFiscalAmount(calcTotal(data.bebanLain), true))}</td>
                </tr>

                {/* Laba Sebelum Pajak */}
                <tr><td colSpan={7} className="h-4 border-none"></td></tr>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-bold text-sm border-y border-slate-200 dark:border-slate-700">
                  <td className="py-4 pl-4 uppercase text-slate-800 dark:text-slate-200 tracking-wide">LABA (RUGI) SEBELUM PAJAK</td>
                  <td colSpan={2}></td>
                  <td className="text-right py-4 pr-4 text-slate-800 dark:text-slate-200">
                    {renderAmount(data.grossProfit - data.totalOperatingExpenses + data.totalPendapatanLain - data.totalBebanLain)}
                  </td>
                  <td colSpan={2} className="text-center text-xs text-muted-foreground italic">(Net Koreksi)</td>
                  <td className="text-right py-4 pr-4">
                     {/* According to standard, Fiscal Net Income Before Tax = Commercial + Total Positif - Total Negatif */}
                     {(() => {
                         const comm = data.grossProfit - data.totalOperatingExpenses + data.totalPendapatanLain - data.totalBebanLain;
                         const tPos = data.pendapatanUsaha.koreksiPositif + calcTotal(data.operatingExpenses).koreksiPositif + calcTotal(data.pendapatanLain).koreksiPositif + calcTotal(data.bebanLain).koreksiPositif;
                         const tNeg = data.pendapatanUsaha.koreksiNegatif + calcTotal(data.operatingExpenses).koreksiNegatif + calcTotal(data.pendapatanLain).koreksiNegatif + calcTotal(data.bebanLain).koreksiNegatif;
                         return renderAmount(comm + tPos - tNeg);
                     })()}
                  </td>
                </tr>

                {/* 5. Pajak Masa Kini */}
                <tr className="border-b border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="text-left py-3 pl-4 text-slate-700 dark:text-slate-300">Beban Pajak</td>
                  <td colSpan={2}></td>
                  <td className="text-right py-3 pr-4 text-rose-600 dark:text-rose-400">
                    {renderAmount(data.bebanPajakMasaKini.amount)}
                  </td>
                  <td className="text-right py-3 pr-4">{renderAmount(data.bebanPajakMasaKini.koreksiNegatif)}</td>
                  <td className="text-right py-3 pr-4">{renderAmount(data.bebanPajakMasaKini.koreksiPositif)}</td>
                  <td className="text-right py-3 pr-4 text-rose-600 dark:text-rose-400">
                    {renderAmount(getFiscalAmount(data.bebanPajakMasaKini, true))}
                  </td>
                </tr>

              </tbody>
              
              {/* Laba Bersih */}
              <tfoot>
                <tr><td colSpan={7} className="h-6 border-none"></td></tr>
                <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-100 dark:to-slate-200 text-white dark:text-slate-900 font-extrabold text-[15px] rounded-xl shadow-lg">
                  <td colSpan={3} className="py-4 pl-6 rounded-l-xl uppercase tracking-widest border-y border-l border-slate-700 dark:border-slate-300">
                    Laba (Rugi) Bersih Setelah Pajak Disetahunkan
                  </td>
                  <td className="text-right py-4 pr-4 bg-slate-900/50 dark:bg-white/50 border-y border-slate-700 dark:border-slate-300">
                    {renderAmount(data.netIncome)}
                  </td>
                  <td colSpan={2} className="border-y border-slate-700 dark:border-slate-300"></td>
                  <td className="text-right py-4 pr-6 rounded-r-xl border-y border-r border-slate-700 dark:border-slate-300">
                     {(() => {
                         const comm = data.netIncome;
                         const tPos = data.pendapatanUsaha.koreksiPositif + calcTotal(data.operatingExpenses).koreksiPositif + calcTotal(data.pendapatanLain).koreksiPositif + calcTotal(data.bebanLain).koreksiPositif + data.bebanPajakMasaKini.koreksiPositif;
                         const tNeg = data.pendapatanUsaha.koreksiNegatif + calcTotal(data.operatingExpenses).koreksiNegatif + calcTotal(data.pendapatanLain).koreksiNegatif + calcTotal(data.bebanLain).koreksiNegatif + data.bebanPajakMasaKini.koreksiNegatif;
                         return renderAmount(comm + tPos - tNeg);
                     })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
