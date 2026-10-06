'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, PieChart, Loader2, Printer } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { DateRangeFilter } from '@/components/ui/date-range-filter';

import { exportProfitLossPDF } from '@/lib/pdf-export';

interface SummaryItem {
  name: string;
  amount: number;
}

interface PnlDataItem {
  amount: number;
  koreksiPositif?: number;
  koreksiNegatif?: number;
}

interface PnlData {
  pendapatanUsaha: PnlDataItem;
  bebanPokokPenjualan: PnlDataItem;
  grossProfit: number;
  operatingExpenses: SummaryItem[];
  totalOperatingExpenses: number;
  pendapatanLain: SummaryItem[];
  totalPendapatanLain: number;
  bebanLain: SummaryItem[];
  totalBebanLain: number;
  bebanPajakMasaKini: PnlDataItem;
  netIncome: number;
}


export default function ProfitLossPage() {
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
        console.error('Failed to fetch profit loss:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fiscalYear, startDate, endDate]);

  const handlePrint = () => {
    exportProfitLossPDF(data as any, fiscalYear, startDate, endDate);
  };

  const renderAmount = (amount: number, colorClass?: string) => {
    if (Math.abs(amount) < 0.01) return <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>;
    return <span className={`font-mono tracking-tight ${colorClass || ''}`}>{formatCurrency(amount)}</span>;
  };

  const renderSummaryRows = (items: SummaryItem[], isSubtracted = false) => {
    if (!items || items.length === 0) return null;
    return items.map((item, idx) => (
      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">{item.name}</td>
        <td className="text-right py-2 pr-4">
          {renderAmount(item.amount, isSubtracted ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}
        </td>
      </tr>
    ));
  };

  return (
    <div className="p-4 md:p-8 w-full space-y-6">
      
      {/* Breadcrumb & Header */}
      <div className="flex items-center justify-between mb-4 print-hide">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="btn btn-secondary btn-sm" style={{ padding: '0.5rem', borderRadius: 'var(--radius-full)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PieChart className="text-primary" /> Laba Rugi (Profit & Loss)
            </h1>
            <p className="text-muted-foreground text-sm">Laporan pendapatan dan beban untuk mengetahui keuntungan/kerugian.</p>
          </div>
        </div>
        <button onClick={handlePrint} className="btn btn-primary">
          <Printer size={18} /> Ekspor PDF
        </button>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Laba Rugi (Profit & Loss)</h1>
        <p className="text-gray-600">
          Tahun Fiskal: {fiscalYear} {startDate && endDate ? `| Periode: ${startDate} s/d ${endDate}` : ''}
        </p>
      </div>

      {/* Main Content */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Unified Tab Switcher & Filters */}
        <div className="print-hide p-4 flex flex-wrap gap-4 items-center justify-between border-b border-border bg-slate-50/50 dark:bg-slate-800/30">
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.1)', padding: '0.25rem', borderRadius: 'var(--radius-full)' }}>
            <button 
              className={`btn ${fiscalYear === '2025' ? 'btn-primary' : ''}`}
              style={{ 
                padding: '0.6rem 1.5rem', 
                borderRadius: 'var(--radius-full)', 
                background: fiscalYear === '2025' ? 'var(--primary)' : 'transparent', 
                color: fiscalYear === '2025' ? 'white' : 'var(--text-muted)', 
                border: 'none', 
                boxShadow: 'none',
                fontWeight: 600
              }}
              onClick={() => setFiscalYear('2025')}
            >
              Tahun 2025
            </button>
            <button 
              className={`btn ${fiscalYear === '2026' ? 'btn-primary' : ''}`}
              style={{ 
                padding: '0.6rem 1.5rem', 
                borderRadius: 'var(--radius-full)', 
                background: fiscalYear === '2026' ? 'var(--primary)' : 'transparent', 
                color: fiscalYear === '2026' ? 'white' : 'var(--text-muted)', 
                border: 'none', 
                boxShadow: 'none',
                fontWeight: 600
              }}
              onClick={() => setFiscalYear('2026')}
            >
              Tahun 2026
            </button>
          </div>

          <DateRangeFilter 
            onFilter={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }} 
          />
        </div>

        <div className="p-8">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Loader2 className="animate-spin mb-4 opacity-50" size={40} />
            <p>Mengkalkulasi Laba Rugi...</p>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-muted-foreground">
            Tidak ada data untuk periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="text-left font-bold py-3 pl-4 w-3/4">KETERANGAN</th>
                  <th className="text-right font-bold py-3 pr-4">JUMLAH</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Pendapatan Usaha & HPP */}
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 pl-4 font-semibold text-slate-800 dark:text-slate-200">Pendapatan Usaha</td>
                  <td className="text-right py-3 pr-4 text-emerald-600 dark:text-emerald-400">{renderAmount(data.pendapatanUsaha.amount)}</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 pl-4 font-semibold text-slate-800 dark:text-slate-200">Beban Pokok Penjualan</td>
                  <td className="text-right py-3 pr-4 text-rose-600 dark:text-rose-400">{renderAmount(data.bebanPokokPenjualan.amount)}</td>
                </tr>
                
                {/* Laba Kotor */}
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-bold text-base print-color-adjust border-y border-slate-200 dark:border-slate-700">
                  <td className="py-4 pl-4 uppercase text-slate-800 dark:text-slate-200 tracking-wide">PENDAPATAN KOTOR</td>
                  <td className="text-right py-4 pr-4 text-slate-800 dark:text-slate-200">
                    {renderAmount(data.grossProfit)}
                  </td>
                </tr>

                {/* 2. Beban Usaha */}
                <tr><td colSpan={2} className="h-4 border-none"></td></tr>
                <tr>
                  <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-primary px-4 py-2 uppercase tracking-wider">BEBAN USAHA</td>
                </tr>
                {renderSummaryRows(data.operatingExpenses, true)}
                <tr className="border-b border-slate-200 dark:border-slate-700 font-bold bg-slate-50/30 dark:bg-slate-800/10">
                  <td className="text-left py-3 pl-4 uppercase text-[11px] tracking-widest text-slate-600 dark:text-slate-300">JUMLAH BEBAN USAHA</td>
                  <td className="text-right py-3 pr-4">
                    {renderAmount(data.totalOperatingExpenses, 'text-rose-600 dark:text-rose-400')}
                  </td>
                </tr>
                
                {/* 3. Pendapatan Lain Lain */}
                <tr><td colSpan={2} className="h-4 border-none"></td></tr>
                <tr>
                  <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-primary px-4 py-2 uppercase tracking-wider">PENDAPATAN LAIN LAIN</td>
                </tr>
                {renderSummaryRows(data.pendapatanLain, false)}
                <tr className="border-b border-slate-200 dark:border-slate-700 font-bold bg-slate-50/30 dark:bg-slate-800/10">
                  <td className="text-left py-3 pl-4 uppercase text-[11px] tracking-widest text-slate-600 dark:text-slate-300">JUMLAH PENDAPATAN LAIN LAIN</td>
                  <td className="text-right py-3 pr-4">
                    {renderAmount(data.totalPendapatanLain, 'text-emerald-600 dark:text-emerald-400')}
                  </td>
                </tr>

                {/* 4. Beban Lain Lain */}
                <tr><td colSpan={2} className="h-4 border-none"></td></tr>
                <tr>
                  <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-primary px-4 py-2 uppercase tracking-wider">BEBAN LAIN LAIN</td>
                </tr>
                {renderSummaryRows(data.bebanLain, true)}
                <tr className="border-b border-slate-200 dark:border-slate-700 font-bold bg-slate-50/30 dark:bg-slate-800/10">
                  <td className="text-left py-3 pl-4 uppercase text-[11px] tracking-widest text-slate-600 dark:text-slate-300">JUMLAH BEBAN LAIN LAIN</td>
                  <td className="text-right py-3 pr-4">
                    {renderAmount(data.totalBebanLain, 'text-rose-600 dark:text-rose-400')}
                  </td>
                </tr>

                {/* 5. Pajak Masa Kini */}
                <tr><td colSpan={2} className="h-4 border-none"></td></tr>
                <tr className="border-y border-slate-200 dark:border-slate-700 font-semibold bg-slate-100/50 dark:bg-slate-800/50">
                  <td className="text-left py-4 pl-4 uppercase text-sm tracking-wide text-slate-700 dark:text-slate-300">BEBAN PAJAK MASA KINI</td>
                  <td className="text-right py-4 pr-4">
                    {renderAmount(data.bebanPajakMasaKini.amount, 'text-rose-600 dark:text-rose-400')}
                  </td>
                </tr>

              </tbody>
              
              {/* Laba Bersih */}
              <tfoot>
                <tr><td colSpan={2} className="h-8 border-none"></td></tr>
                <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-100 dark:to-slate-200 text-white dark:text-slate-900 font-extrabold text-lg rounded-xl shadow-lg print:bg-slate-200 print:text-black">
                  <td className="py-5 pl-6 rounded-l-xl uppercase tracking-widest print:rounded-none border-y border-l border-slate-700 dark:border-slate-300">
                    LABA (RUGI)
                  </td>
                  <td className="text-right py-5 pr-6 rounded-r-xl print:rounded-none border-y border-r border-slate-700 dark:border-slate-300">
                    {renderAmount(data.netIncome)}
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
