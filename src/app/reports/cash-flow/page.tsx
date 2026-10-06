'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRightLeft, Loader2, Printer } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { DateRangeFilter } from '@/components/ui/date-range-filter';

import { exportCashFlowPDF } from '@/lib/pdf-export';

interface CashFlowData {
  pendapatan: number;
  pembayaranPemasokKaryawan: number;
  penerimaanLainnya: number;
  arusKasOperasional: number;
  pembelian: number;
  pembelianAsetTetap: number;
  arusKasInvestasi: number;
  
  pinjamanPemegangSaham: number;
  modal: number;
  modalBelumDisetor: number;
  arusKasPendanaan: number;
  
  kenaikanKas: number;
  saldoAwal: number;
  saldoAkhir: number;
}

export default function CashFlowPage() {
  const [fiscalYear, setFiscalYear] = useState('2025');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `/api/reports/cash-flow?fiscalYear=${fiscalYear}&_t=${Date.now()}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;

        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch cash flow:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fiscalYear, startDate, endDate]);

  const handlePrint = () => {
    exportCashFlowPDF(data, fiscalYear, startDate, endDate);
  };

  const renderAmount = (amount: number, forceParenthesesForNegative: boolean = false) => {
    if (Math.abs(amount) < 0.01) return <span className="text-slate-300 dark:text-slate-600 font-mono">-</span>;
    // For Direct Method Cash Flow, negatives are cash outflows, often shown in parentheses
    if (amount < 0 || forceParenthesesForNegative) {
      return <span className="font-mono tracking-tight text-rose-600 dark:text-rose-400">({formatCurrency(Math.abs(amount))})</span>;
    }
    return <span className="font-mono tracking-tight text-emerald-600 dark:text-emerald-400">{formatCurrency(amount)}</span>;
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
              <ArrowRightLeft className="text-primary" /> Arus Kas (Cash Flow)
            </h1>
            <p className="text-muted-foreground text-sm">Laporan penerimaan dan pengeluaran kas.</p>
          </div>
        </div>
        <button onClick={handlePrint} className="btn btn-primary" disabled={!data}>
          <Printer size={18} /> Ekspor PDF
        </button>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Arus Kas (Cash Flow)</h1>
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
            <p>Mengkalkulasi Arus Kas...</p>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-muted-foreground">
            Tidak ada data untuk periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead>
                <tr>
                  <th className="text-left w-2/3">KETERANGAN</th>
                  <th className="text-right w-1/3">JUMLAH</th>
                </tr>
              </thead>
              <tbody>
                
                {/* Operasional */}
                <tr>
                  <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-emerald-700 px-4 py-2 uppercase tracking-wider text-xs">
                    Aktivitas Operasional
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">Pendapatan</td>
                  <td className="text-right py-2 pr-4">{renderAmount(data.pendapatan)}</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">(Pembayaran) ke pemasok dan karyawan</td>
                  <td className="text-right py-2 pr-4">{renderAmount(data.pembayaranPemasokKaryawan)}</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">Penerimaan (Pembayaran) Lainnya</td>
                  <td className="text-right py-2 pr-4">{renderAmount(data.penerimaanLainnya)}</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700 font-semibold bg-slate-50/30 dark:bg-slate-800/10">
                  <td className="text-left py-3 pl-4 uppercase text-[10px] tracking-widest text-slate-500">Arus Kas Untuk Aktivitas Operasional</td>
                  <td className="text-right py-3 pr-4 font-bold">
                    {renderAmount(data.arusKasOperasional)}
                  </td>
                </tr>

                <tr><td colSpan={2} className="h-6 border-none"></td></tr>

                {/* Investasi */}
                <tr>
                  <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-rose-700 px-4 py-2 uppercase tracking-wider text-xs">
                    Aktivitas Investasi
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">Pembelian</td>
                  <td className="text-right py-2 pr-4">{renderAmount(data.pembelian)}</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">Pembelian Aset Tetap</td>
                  <td className="text-right py-2 pr-4">{renderAmount(data.pembelianAsetTetap)}</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700 font-semibold bg-rose-50/30 dark:bg-rose-900/10">
                  <td className="text-left py-3 pl-4 uppercase text-[10px] tracking-widest text-slate-500">Arus Kas Untuk Investasi</td>
                  <td className="text-right py-3 pr-4 font-bold">
                    {renderAmount(data.arusKasInvestasi)}
                  </td>
                </tr>

                <tr><td colSpan={2} className="h-6 border-none"></td></tr>

                {/* Pendanaan */}
                <tr>
                  <td colSpan={2} className="font-bold bg-slate-50/50 dark:bg-slate-800/30 text-primary px-4 py-2 uppercase tracking-wider text-xs">
                    Aktivitas Pendanaan
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">Pinjaman kepada Pemegang Saham</td>
                  <td className="text-right py-2 pr-4">{renderAmount(data.pinjamanPemegangSaham)}</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">Modal</td>
                  <td className="text-right py-2 pr-4">{renderAmount(data.modal)}</td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-2 pl-8 font-medium text-sm text-slate-700 dark:text-slate-300">Modal yang belum disetor</td>
                  <td className="text-right py-2 pr-4">{renderAmount(data.modalBelumDisetor)}</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700 font-semibold bg-primary/5">
                  <td className="text-left py-3 pl-4 uppercase text-[10px] tracking-widest text-slate-500">Arus Kas Untuk Aktivitas Pendanaan</td>
                  <td className="text-right py-3 pr-4 font-bold">
                    {renderAmount(data.arusKasPendanaan)}
                  </td>
                </tr>

              </tbody>
              <tfoot>
                <tr><td colSpan={2} className="h-8 border-none"></td></tr>
                
                <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold border-y-2 border-slate-300 dark:border-slate-600">
                  <td className="py-3 pl-4 uppercase tracking-widest text-xs">Kenaikan (Penurunan) Kas</td>
                  <td className="text-right py-3 pr-4">
                    {renderAmount(data.kenaikanKas)}
                  </td>
                </tr>

                <tr><td colSpan={2} className="h-4 border-none"></td></tr>

                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group font-semibold">
                  <td className="py-3 pl-4">Saldo Kas Awal Tahun</td>
                  <td className="text-right py-3 pr-4">{renderAmount(data.saldoAwal)}</td>
                </tr>
                <tr className="bg-gradient-to-r from-primary/10 to-primary/5 text-primary-hover dark:text-primary-light font-extrabold text-base rounded-lg overflow-hidden border-2 border-primary/20 shadow-sm">
                  <td className="py-4 pl-4 rounded-l-lg uppercase tracking-wider">
                    Saldo Kas Akhir Tahun
                  </td>
                  <td className="text-right py-4 pr-4 rounded-r-lg">
                    {renderAmount(data.saldoAkhir)}
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
