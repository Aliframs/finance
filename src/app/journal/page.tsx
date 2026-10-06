'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Loader2, Search, Filter, Download } from 'lucide-react';

interface JournalEntry {
  id: string;
  voucher: { voucherNumber: string; date: string; };
  coa: { accountNumber: string; accountName: string; };
  description: string | null;
  debit: number;
  credit: number;
  date: string;
  type: string;
  fiscalYear: string;
}

export default function JournalPage() {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const currentSystemYear = Math.max(new Date().getFullYear(), 2025);
  const availableYears = Array.from({ length: currentSystemYear - 2025 + 2 }, (_, i) => (2025 + i).toString());
  const [filterYear, setFilterYear] = useState(currentSystemYear.toString());

  useEffect(() => {
    fetch('/api/journals')
      .then(res => res.json())
      .then(data => {
        setJournals(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch journals:', err);
        setLoading(false);
      });
  }, []);

  const uniqueCategories = useMemo(() => {
    const accs = new Set(journals.map(j => `${j.coa?.accountNumber} - ${j.coa?.accountName}`));
    return Array.from(accs).filter(Boolean).sort();
  }, [journals]);

    const filteredJournals = journals.filter(j => {
    if (j.fiscalYear !== filterYear) return false;

    const matchSearch = j.voucher?.voucherNumber?.toLowerCase().includes(search.toLowerCase()) ||
      j.description?.toLowerCase().includes(search.toLowerCase()) ||
      j.coa?.accountName?.toLowerCase().includes(search.toLowerCase()) ||
      j.coa?.accountNumber?.toLowerCase().includes(search.toLowerCase());
      
    const cat = `${j.coa?.accountNumber} - ${j.coa?.accountName}`;
    const matchCategory = filterCategory === 'ALL' || cat === filterCategory;

    return matchSearch && matchCategory;
  });

  const exportToCSV = () => {
    if (filteredJournals.length === 0) return;
    
    const headers = ['Tanggal', 'No. Voucher', 'No. Akun', 'Nama Akun', 'Keterangan', 'Debit', 'Kredit'];
    
    const rows = filteredJournals.map(j => {
      const date = formatDate(j.date || j.voucher?.date);
      const voucher = j.voucher?.voucherNumber || '';
      const accNum = j.coa?.accountNumber || '';
      const accName = `"${(j.coa?.accountName || '').replace(/"/g, '""')}"`;
      const desc = `"${(j.description || '-').replace(/"/g, '""')}"`;
      return [date, voucher, accNum, accName, desc, j.debit, j.credit].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Buku_Jurnal_${filterYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Year Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {availableYears.map(y => (
          <button 
            key={y}
            className={`btn ${filterYear === y ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterYear(y)}
            style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-full)' }}
          >
            Tahun Buku {y}
          </button>
        ))}
      </div>

      {/* Unified Header & Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Buku Jurnal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Riwayat seluruh entri jurnal dari setiap voucher.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={exportToCSV} disabled={filteredJournals.length === 0} style={{ padding: '0.5rem 1rem' }}>
            <Download size={14} /> Download CSV
          </button>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-field" style={{ paddingLeft: '2.5rem', marginBottom: 0, fontSize: '0.85rem' }}
              placeholder="Cari voucher, nama akun, keterangan..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ position: 'relative' }}>
            <Filter size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <select className="input-field" style={{ paddingLeft: '2.2rem', paddingRight: '2rem', marginBottom: 0, fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}
              value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="ALL">Semua Akun (COA)</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Riwayat Jurnal</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Menampilkan {filteredJournals.length} baris jurnal
          </span>
        </div>
        
        {loading ? (
          <div className="empty-state">
            <Loader2 size={40} className="animate-spin" style={{ opacity: 0.5 }} />
            <p>Sinkronisasi data jurnal...</p>
          </div>
        ) : filteredJournals.length === 0 ? (
          <div className="empty-state">
            <Search />
            <p>Belum ada data untuk Jurnal.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>No. Voucher</th>
                <th>No. Akun</th>
                <th>Nama Akun</th>
                <th>Keterangan</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Kredit</th>
              </tr>
            </thead>
            <tbody>
              {filteredJournals.map(j => (
                <tr key={j.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(j.date || j.voucher?.date)}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{j.voucher?.voucherNumber}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{j.coa?.accountNumber}</td>
                  <td>{j.coa?.accountName}</td>
                  <td>{j.description || '-'}</td>
                  <td style={{ textAlign: 'right' }}>Rp {formatCurrency(j.debit)}</td>
                  <td style={{ textAlign: 'right' }}>Rp {formatCurrency(j.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
