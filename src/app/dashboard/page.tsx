'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getBadgeClass, getStatusLabel } from '@/lib/ui-helpers';
import {
  FileText, Clock, CheckCircle, XCircle, Plus, ArrowRight, Loader2
} from 'lucide-react';

interface DashboardVoucher {
  id: string;
  voucherNumber: string;
  vendor: { name: string };
  description: string;
  nominal: number;
  status: string;
  date: string;
}

export default function DashboardPage() {
  const { currentRole } = useAuth();
  
  const [vouchers, setVouchers] = useState<DashboardVoucher[]>([]);
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

  const draftCount = vouchers.filter(v => v.status === 'DRAFT').length;
  const pendingCount = vouchers.filter(v => !['DRAFT', 'COMPLETED', 'CANCELLED'].includes(v.status)).length;
  const completedCount = vouchers.filter(v => v.status === 'COMPLETED').length;
  const cancelledCount = vouchers.filter(v => v.status === 'CANCELLED').length;

  const stats = [
    { label: 'Draft', value: draftCount, icon: FileText, bg: '#f1f5f9', color: '#64748b' },
    { label: 'Pending', value: pendingCount, icon: Clock, bg: '#fef3c7', color: '#b45309' },
    { label: 'Completed', value: completedCount, icon: CheckCircle, bg: '#d1fae5', color: '#047857' },
    { label: 'Cancelled', value: cancelledCount, icon: XCircle, bg: '#fee2e2', color: '#b91c1c' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Ringkasan voucher Anda hari ini.
          </p>
        </div>
        {currentRole === 'ADMIN' && (
          <Link href="/vouchers/create" className="btn btn-primary">
            <Plus size={18} />
            Buat Voucher Baru
          </Link>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem' }}>{stat.label}</p>
                <h2 style={{ fontSize: '2rem', margin: 0 }}>
                  {loading ? <Loader2 size={24} className="animate-spin" color="var(--text-muted)" /> : stat.value}
                </h2>
              </div>
              <div style={{ padding: '0.65rem', background: stat.bg, borderRadius: '12px', color: stat.color }}>
                <stat.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Vouchers Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Voucher Terbaru</h3>
          <Link href="/vouchers" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Lihat Semua <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Memuat data dashboard...</p>
          </div>
        ) : vouchers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Belum ada voucher yang dibuat.</p>
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
              {vouchers.slice(0, 5).map((v) => (
                <tr key={v.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                    {v.voucherNumber}
                  </td>
                  <td>{v.vendor?.name}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.description}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                    <span style={{ color: v.nominal < 0 ? 'var(--danger)' : 'inherit' }}>
                      Rp {formatCurrency(v.nominal)}
                    </span>
                  </td>
                  <td>
                    <span className={getBadgeClass(v.status)}>
                      {getStatusLabel(v.status)}
                    </span>
                  </td>
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
