'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface EquityRow {
  label: string;
  modalSaham: number;
  oci: number;
  ditentukan: number;
  tidakDitentukan: number;
  isTotal: boolean;
}

export default function EquityPage() {
  const [fiscalYear, setFiscalYear] = useState('2025');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ rows: EquityRow[] } | null>(null);

  useEffect(() => {
    fetchData();
  }, [fiscalYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch with cache busting
      const res = await fetch(`/api/reports/equity?fiscalYear=${fiscalYear}&t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    if (amount < 0) return `(${Math.abs(amount).toLocaleString('id-ID')})`;
    return amount.toLocaleString('id-ID');
  };

  const handleExportPDF = async () => {
    try {
      const { exportEquityToPDF } = await import('@/lib/pdf-export');
      if (data) {
        exportEquityToPDF(data.rows, fiscalYear);
      }
    } catch (error) {
      console.error('Failed to export PDF', error);
      alert('Gagal mengekspor PDF. Pastikan fitur export telah diimplementasi.');
    }
  };

  return (
    <div className="p-4 md:p-8 w-full space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="btn btn-secondary btn-sm" style={{ padding: '0.5rem', borderRadius: 'var(--radius-full)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="text-primary" /> Perubahan Ekuitas
            </h1>
            <p className="text-muted-foreground text-sm">Laporan pergerakan modal dan laba ditahan.</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={handleExportPDF} disabled={loading || !data}>
          <Download size={16} /> Export PDF
        </button>
      </div>

      {/* Unified Tab Switcher */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.1)', padding: '0.25rem', borderRadius: 'var(--radius-full)' }}>
          <button className={`btn ${fiscalYear === '2025' ? 'btn-primary' : ''}`} style={{ padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-full)', background: fiscalYear === '2025' ? 'var(--primary)' : 'transparent', color: fiscalYear === '2025' ? 'white' : 'var(--text-muted)', border: 'none', boxShadow: 'none', fontWeight: 600 }} onClick={() => setFiscalYear('2025')}>Tahun 2025</button>
          <button className={`btn ${fiscalYear === '2026' ? 'btn-primary' : ''}`} style={{ padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-full)', background: fiscalYear === '2026' ? 'var(--primary)' : 'transparent', color: fiscalYear === '2026' ? 'white' : 'var(--text-muted)', border: 'none', boxShadow: 'none', fontWeight: 600 }} onClick={() => setFiscalYear('2026')}>Tahun 2026</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12 glass-panel">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="ml-3 text-lg text-muted-foreground">Memuat laporan...</span>
        </div>
      ) : (
        <div className="glass-panel p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--border)]">
                <th className="p-3 text-left font-bold text-[var(--foreground)] w-1/4 align-bottom">Keterangan</th>
                <th className="p-3 text-right font-bold text-[var(--foreground)] align-bottom">Modal Saham</th>
                <th className="p-3 text-right font-bold text-[var(--foreground)] align-bottom">Penghasilan Komprehensif Lain</th>
                <th className="p-3 text-right font-bold text-[var(--foreground)] align-bottom">Saldo Laba Ditentukan</th>
                <th className="p-3 text-right font-bold text-[var(--foreground)] align-bottom">Saldo Laba Tidak Ditentukan</th>
                <th className="p-3 text-right font-bold text-[var(--foreground)] align-bottom">Jumlah Ekuitas</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((row, index) => {
                const total = row.modalSaham + row.oci + row.ditentukan + row.tidakDitentukan;
                return (
                  <tr key={index} className={row.isTotal ? "font-bold bg-[var(--muted)]/30 border-t-2 border-[var(--border)]" : "border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/10"}>
                    <td className="p-3">{row.label}</td>
                    <td className="p-3 text-right">{formatCurrency(row.modalSaham)}</td>
                    <td className="p-3 text-right">{formatCurrency(row.oci)}</td>
                    <td className="p-3 text-right">{formatCurrency(row.ditentukan)}</td>
                    <td className="p-3 text-right">{formatCurrency(row.tidakDitentukan)}</td>
                    <td className="p-3 text-right text-primary">{formatCurrency(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
