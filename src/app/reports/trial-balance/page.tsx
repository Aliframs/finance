'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Calculator, Loader2, Printer, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { DateRangeFilter } from '@/components/ui/date-range-filter';

import { exportTrialBalancePDF } from '@/lib/pdf-export';

interface TrialBalanceItem {
  id: string;
  accountNumber: string;
  accountName: string;
  category: string;
  normalBalance: string;
  startingBalance: number;
  debit: number;
  credit: number;
  endingBalance: number;
}

export default function TrialBalancePage() {
  const [fiscalYear, setFiscalYear] = useState('2025');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<TrialBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `/api/reports/trial-balance?fiscalYear=${fiscalYear}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch trial balance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fiscalYear, startDate, endDate]);

  const handlePrint = () => {
    exportTrialBalancePDF(data, fiscalYear, startDate, endDate);
  };

  // Calculate Totals (Mathematically sums to 0 if balanced)
  const totalStarting = data.reduce((sum, item) => sum + item.startingBalance, 0);
  const totalDebit = data.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = data.reduce((sum, item) => sum + item.credit, 0);
  const totalEnding = data.reduce((sum, item) => sum + item.endingBalance, 0);

  const netEnding = data.reduce((sum, item) => sum + item.endingBalance, 0);
  const isUnbalanced = Math.abs(netEnding) > 0.01;

  const renderAmount = (amount: number, colorClass?: string) => {
    if (Math.abs(amount) < 0.01) return <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>;
    return <span className={`font-mono font-medium tracking-tight ${colorClass || ''}`}>{formatCurrency(amount)}</span>;
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
              <Calculator className="text-primary" /> Neraca Saldo (Trial Balance)
            </h1>
            <p className="text-muted-foreground text-sm">Daftar saldo dari seluruh buku besar per akun.</p>
          </div>
        </div>
        <button onClick={handlePrint} className="btn btn-primary">
          <Printer size={18} /> Ekspor PDF
        </button>
      </div>
      
      {/* Print Only Header */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Neraca Saldo (Trial Balance)</h1>
        <p className="text-gray-600">
          Tahun Fiskal: {fiscalYear} {startDate && endDate ? `| Periode: ${startDate} s/d ${endDate}` : ''}
        </p>
      </div>

      {/* Main Content */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Unified Tab Switcher & Filters (Merged into Table Card) */}
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

        {/* Unbalanced Warning Alert */}
        {!loading && data.length > 0 && isUnbalanced && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 p-4 flex items-start gap-3 print:bg-white print:border-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Peringatan: Tidak Balance</h4>
              <p className="text-sm mt-1">Total Debit dan Kredit memiliki selisih sebesar <strong>{formatCurrency(totalEnding)}</strong>. Periksa kembali entri jurnal Anda.</p>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="w-16">No. Akun</th>
                <th>Nama Akun</th>
                <th>Kategori</th>
                <th className="text-right">Saldo Awal</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Kredit</th>
                <th className="text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="animate-spin mx-auto mb-2 opacity-50" size={32} />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Tidak ada data untuk periode ini.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="font-mono text-xs font-semibold text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">{item.accountNumber}</td>
                    <td className="font-medium">{item.accountName}</td>
                    <td>
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="text-right">{renderAmount(item.startingBalance)}</td>
                    <td className="text-right">{renderAmount(item.debit, 'text-emerald-600 dark:text-emerald-400')}</td>
                    <td className="text-right">{renderAmount(item.credit, 'text-rose-600 dark:text-rose-400')}</td>
                    <td className="text-right font-semibold">{renderAmount(item.endingBalance)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && data.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                  <td colSpan={3} className="text-right py-4 px-4 uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">Total Keseluruhan:</td>
                  <td className="text-right py-4 px-4">{renderAmount(totalStarting)}</td>
                  <td className="text-right py-4 px-4">{renderAmount(totalDebit, 'text-emerald-600 dark:text-emerald-400')}</td>
                  <td className="text-right py-4 px-4">{renderAmount(totalCredit, 'text-rose-600 dark:text-rose-400')}</td>
                  <td className="text-right py-4 px-4">{renderAmount(totalEnding, isUnbalanced ? 'text-rose-600 dark:text-rose-400' : 'text-primary')}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
