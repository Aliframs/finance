'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Loader2, Printer } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { DateRangeFilter } from '@/components/ui/date-range-filter';

import { exportBalanceSheetPDF } from '@/lib/pdf-export';

interface SummaryItem {
  name: string;
  amount: number;
}

interface BalanceSheetData {
  assets: {
    current: SummaryItem[];
    nonCurrent: SummaryItem[];
    total: number;
  };
  liabilities: {
    current: SummaryItem[];
    nonCurrent: SummaryItem[];
    total: number;
  };
  equity: {
    items: SummaryItem[];
    currentYearEarnings: number;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
}

export default function BalanceSheetPage() {
  const [fiscalYear, setFiscalYear] = useState('2025');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `/api/reports/balance-sheet?fiscalYear=${fiscalYear}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;

        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch balance sheet:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fiscalYear, startDate, endDate]);

  const handlePrint = () => {
    exportBalanceSheetPDF(data, fiscalYear, startDate, endDate);
  };

  const renderAmount = (amount: number, colorClass?: string) => {
    if (Math.abs(amount) < 0.01) return <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>;
    return <span className={`font-mono tracking-tight ${colorClass || ''}`}>{formatCurrency(amount)}</span>;
  };

  const renderSummaryRows = (items: SummaryItem[]) => {
    if (!items || items.length === 0) return null;
    return items.map((item, idx) => (
      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">{item.name}</td>
        <td className="text-right py-2 pr-4">
          {renderAmount(item.amount, 'text-emerald-600 dark:text-emerald-400')}
        </td>
      </tr>
    ));
  };
  
  const renderSummaryRowsLiab = (items: SummaryItem[]) => {
    if (!items || items.length === 0) return null;
    return items.map((item, idx) => (
      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">{item.name}</td>
        <td className="text-right py-2 pr-4">
          {renderAmount(item.amount, 'text-rose-600 dark:text-rose-400')}
        </td>
      </tr>
    ));
  };
  
  const renderSummaryRowsEquity = (items: SummaryItem[]) => {
    if (!items || items.length === 0) return null;
    return items.map((item, idx) => (
      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
        <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">{item.name}</td>
        <td className="text-right py-2 pr-4">
          {renderAmount(item.amount, 'text-emerald-600 dark:text-emerald-400')}
        </td>
      </tr>
    ));
  };

  const isUnbalanced = data && Math.abs(data.assets.total - data.totalLiabilitiesAndEquity) > 0.01;

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
              <FileText className="text-primary" /> Neraca (Balance Sheet)
            </h1>
            <p className="text-muted-foreground text-sm">Laporan posisi keuangan (Aset, Kewajiban, dan Ekuitas).</p>
          </div>
        </div>
        <button onClick={handlePrint} className="btn btn-primary">
          <Printer size={18} /> Ekspor PDF
        </button>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Neraca (Balance Sheet)</h1>
        <p className="text-gray-600">
          Tahun Fiskal: {fiscalYear} {startDate && endDate ? `| Periode: ${startDate} s/d ${endDate}` : (endDate ? `| Per: ${endDate}` : '')}
        </p>
      </div>

      {/* Main Content */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Unified Tab Switcher & Filters */}
        <div className="print-hide p-4 flex flex-wrap gap-4 items-center justify-between border-b border-border bg-slate-50/50 dark:bg-slate-800/30">
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.1)', padding: '0.25rem', borderRadius: 'var(--radius-full)' }}>
            <button 
              className={`btn ${fiscalYear === '2025' ? 'btn-primary' : ''}`}
              style={{ padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-full)', background: fiscalYear === '2025' ? 'var(--primary)' : 'transparent', color: fiscalYear === '2025' ? 'white' : 'var(--text-muted)', border: 'none', boxShadow: 'none', fontWeight: 600 }}
              onClick={() => setFiscalYear('2025')}
            >
              Tahun 2025
            </button>
            <button 
              className={`btn ${fiscalYear === '2026' ? 'btn-primary' : ''}`}
              style={{ padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-full)', background: fiscalYear === '2026' ? 'var(--primary)' : 'transparent', color: fiscalYear === '2026' ? 'white' : 'var(--text-muted)', border: 'none', boxShadow: 'none', fontWeight: 600 }}
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
            <p>Mengkalkulasi Neraca...</p>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-muted-foreground">
            Tidak ada data untuk periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            
            {isUnbalanced && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500 rounded-r-md text-rose-700 dark:text-rose-400 print-hide">
                <h3 className="font-bold flex items-center gap-2">
                  <span className="text-xl">⚠️</span> NERACA TIDAK SEIMBANG (UNBALANCED)
                </h3>
                <p className="mt-1 text-sm">
                  Selisih: <strong>{formatCurrency(Math.abs(data.assets.total - data.totalLiabilitiesAndEquity))}</strong>. 
                  Terdapat jurnal yang belum balance, atau akun yang belum dipetakan.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* KOLOM KIRI: ASET */}
              <div>
                <h2 className="text-lg font-bold mb-4 pb-2 border-b-2 border-emerald-500 text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Aktiva (Assets)</h2>
                <table className="w-full text-sm data-table">
                  <tbody>
                    <tr>
                      <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-emerald-700 px-4 py-2 uppercase tracking-wider text-xs">
                        AKTIVA LANCAR
                      </td>
                    </tr>
                    {renderSummaryRows(data.assets.current)}
                    <tr className="border-b border-slate-200 dark:border-slate-700 font-semibold bg-slate-50/30 dark:bg-slate-800/10">
                      <td className="text-left py-3 pl-4 uppercase text-[10px] tracking-widest text-slate-500">JUMLAH AKTIVA LANCAR</td>
                      <td className="text-right py-3 pr-4 text-emerald-600 dark:text-emerald-400">
                        {renderAmount(data.assets.current.reduce((a,b) => a + b.amount, 0))}
                      </td>
                    </tr>

                    <tr><td colSpan={2} className="h-4 border-none"></td></tr>
                    
                    <tr>
                      <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-emerald-700 px-4 py-2 uppercase tracking-wider text-xs">
                        AKTIVA TIDAK LANCAR
                      </td>
                    </tr>
                    {renderSummaryRows(data.assets.nonCurrent)}
                    <tr className="border-b border-slate-200 dark:border-slate-700 font-semibold bg-slate-50/30 dark:bg-slate-800/10">
                      <td className="text-left py-3 pl-4 uppercase text-[10px] tracking-widest text-slate-500">JUMLAH AKTIVA TIDAK LANCAR</td>
                      <td className="text-right py-3 pr-4 text-emerald-600 dark:text-emerald-400">
                        {renderAmount(data.assets.nonCurrent.reduce((a,b) => a + b.amount, 0))}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={2} className="h-6 border-none"></td></tr>
                    <tr className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-extrabold text-base rounded-lg overflow-hidden border-2 border-emerald-500/20 print:border-none print:bg-emerald-100 print:text-emerald-800 shadow-sm">
                      <td className="py-4 pl-4 rounded-l-lg uppercase tracking-wider print:rounded-none">
                        JUMLAH AKTIVA
                      </td>
                      <td className="text-right py-4 pr-4 rounded-r-lg print:rounded-none">
                        {renderAmount(data.assets.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* KOLOM KANAN: KEWAJIBAN & EKUITAS */}
              <div>
                <h2 className="text-lg font-bold mb-4 pb-2 border-b-2 border-primary text-primary-hover dark:text-primary-light uppercase tracking-wider">Kewajiban & Ekuitas</h2>
                <table className="w-full text-sm data-table">
                  <tbody>
                    <tr>
                      <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-rose-700 px-4 py-2 uppercase tracking-wider text-xs">
                        KEWAJIBAN LANCAR
                      </td>
                    </tr>
                    {renderSummaryRowsLiab(data.liabilities.current)}
                    <tr className="border-b border-slate-200 dark:border-slate-700 font-semibold bg-rose-50/30 dark:bg-rose-900/10">
                      <td className="text-left py-3 pl-4 uppercase text-[10px] tracking-widest text-rose-600 dark:text-rose-400">JUMLAH KEWAJIBAN LANCAR</td>
                      <td className="text-right py-3 pr-4 text-rose-600 dark:text-rose-400">
                        {renderAmount(data.liabilities.current.reduce((a,b) => a + b.amount, 0))}
                      </td>
                    </tr>

                    <tr><td colSpan={2} className="h-4 border-none"></td></tr>

                    <tr>
                      <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-rose-700 px-4 py-2 uppercase tracking-wider text-xs">
                        KEWAJIBAN JANGKA PANJANG
                      </td>
                    </tr>
                    {renderSummaryRowsLiab(data.liabilities.nonCurrent)}
                    <tr className="border-b border-slate-200 dark:border-slate-700 font-semibold bg-rose-50/30 dark:bg-rose-900/10">
                      <td className="text-left py-3 pl-4 uppercase text-[10px] tracking-widest text-rose-600 dark:text-rose-400">JUMLAH KEWAJIBAN JANGKA PANJANG</td>
                      <td className="text-right py-3 pr-4 text-rose-600 dark:text-rose-400">
                        {renderAmount(data.liabilities.nonCurrent.reduce((a,b) => a + b.amount, 0))}
                      </td>
                    </tr>
                    
                    <tr><td colSpan={2} className="h-2 border-none"></td></tr>
                    <tr className="bg-rose-100/50 dark:bg-rose-900/20 font-bold border-y border-rose-200 dark:border-rose-800">
                      <td className="py-3 pl-4 uppercase tracking-widest text-xs text-rose-700 dark:text-rose-400">JUMLAH KEWAJIBAN</td>
                      <td className="text-right py-3 pr-4 text-rose-700 dark:text-rose-400">
                        {renderAmount(data.liabilities.total)}
                      </td>
                    </tr>

                    <tr><td colSpan={2} className="h-6 border-none"></td></tr>
                    
                    <tr>
                      <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-primary px-4 py-2 uppercase tracking-wider text-xs">
                        EKUITAS
                      </td>
                    </tr>
                    {renderSummaryRowsEquity(data.equity.items)}
                    
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">Laba (Rugi) Tahun Berjalan</td>
                      <td className="text-right py-2 pr-4">
                        {renderAmount(data.equity.currentYearEarnings, 'text-emerald-600 dark:text-emerald-400')}
                      </td>
                    </tr>
                    
                    <tr className="border-b border-slate-200 dark:border-slate-700 font-semibold bg-primary/5">
                      <td className="text-left py-3 pl-4 uppercase text-[10px] tracking-widest text-primary">JUMLAH EKUITAS</td>
                      <td className="text-right py-3 pr-4 text-primary">
                        {renderAmount(data.equity.total)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={2} className="h-6 border-none"></td></tr>
                    <tr className={`bg-gradient-to-r from-primary/10 to-primary/5 text-primary-hover dark:text-primary-light font-extrabold text-base rounded-lg overflow-hidden border-2 border-primary/20 print:border-none print:bg-slate-200 print:text-black shadow-sm ${isUnbalanced ? 'from-rose-500/10 to-rose-500/5 text-rose-700 border-rose-500/20' : ''}`}>
                      <td className="py-4 pl-4 rounded-l-lg uppercase tracking-wider print:rounded-none">
                        JML KEWAJIBAN & EKUITAS
                      </td>
                      <td className="text-right py-4 pr-4 rounded-r-lg print:rounded-none">
                        {renderAmount(data.totalLiabilitiesAndEquity)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
