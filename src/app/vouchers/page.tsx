'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { STATUS_LABELS, ALL_STATUSES } from '@/lib/workflow-engine';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getBadgeClass, getStatusLabel } from '@/lib/ui-helpers';
import { Search, ArrowRight, Plus, Filter, Loader2 } from 'lucide-react';

interface VoucherList {
  id: string;
  voucherNumber: string;
  vendor: { name: string };
  items?: { description: string }[];
  nominal: number;
  status: string;
  date: string;
}

export default function VouchersPage() {
  const { currentRole } = useAuth();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  const [vouchers, setVouchers] = useState<VoucherList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vouchers')
      .then(res => res.json())
      .then(data => {
        setVouchers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch vouchers:', err);
        setLoading(false);
      });
  }, []);

  const filtered = vouchers.filter(v => {
    const matchSearch = v.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.vendor?.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.items?.some(item => item.description.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'ALL' || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalFilteredNominal = filtered.reduce((sum, v) => sum + (v.nominal || 0), 0);

  return (
    <div>
      {/* Unified Header & Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Daftar Voucher</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Kelola semua voucher pengeluaran perusahaan.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-field" style={{ paddingLeft: '2.5rem', marginBottom: 0, fontSize: '0.85rem' }}
              placeholder="Cari voucher, vendor..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          
          <div style={{ position: 'relative' }}>
            <Filter size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <select className="input-field" style={{ paddingLeft: '2.2rem', paddingRight: '2rem', marginBottom: 0, fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="ALL">Semua Status</option>
              {ALL_STATUSES.map(status => (
                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
              ))}
            </select>
          </div>

          {currentRole === 'ADMIN' && (
            <Link href="/vouchers/create" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
              <Plus size={16} /> Buat Baru
            </Link>
          )}
        </div>
      </div>

      {/* Aggregate Summary */}
      {!loading && filtered.length > 0 && filterStatus !== 'ALL' && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Nominal ({STATUS_LABELS[filterStatus as keyof typeof STATUS_LABELS]}):</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)' }}>Rp {formatCurrency(totalFilteredNominal)}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state">
            <Loader2 size={40} className="animate-spin" style={{ opacity: 0.5 }} />
            <p>Sinkronisasi data voucher...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Search />
            <p>Tidak ada voucher ditemukan.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Voucher</th>
                <th>Vendor</th>
                <th>Keterangan</th>
                <th>Nominal</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{v.voucherNumber}</td>
                  <td>{v.vendor?.name}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.items?.[0]?.description || 'Voucher Pengeluaran'} {v.items && v.items.length > 1 ? `(+${v.items.length - 1})` : ''}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                    <span style={{ color: v.nominal < 0 ? 'var(--danger)' : 'inherit' }}>Rp {formatCurrency(v.nominal)}</span>
                  </td>
                  <td><span className={getBadgeClass(v.status)}>{getStatusLabel(v.status)}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(v.date)}</td>
                  <td>
                    <Link href={`/vouchers/${v.id}`} className="btn btn-secondary btn-sm">
                      Detail <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
