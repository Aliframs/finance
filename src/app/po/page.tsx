'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { PO_STATUS_LABELS } from '@/lib/po-workflow-engine';
import { Plus, Search, FileText, Loader2, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function POListPage() {
  const { currentRole } = useAuth();
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/po')
      .then(res => res.json())
      .then(data => {
        setPos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = pos.filter(po => 
    po.poNumber.toLowerCase().includes(search.toLowerCase()) || 
    po.vendor?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Unified Header & Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Purchase Order (PO)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Kelola dan lacak semua Purchase Order perusahaan.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-field" style={{ paddingLeft: '2.5rem', marginBottom: 0, fontSize: '0.85rem' }}
              placeholder="Cari nomor PO atau vendor..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {currentRole === 'ADMIN' && (
            <Link href="/po/new" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
              <Plus size={16} /> Buat PO Baru
            </Link>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state">
            <Loader2 size={40} className="animate-spin" style={{ opacity: 0.5 }} />
            <p>Sinkronisasi data PO...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <FileText />
            <p>Tidak ada Purchase Order yang ditemukan.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>No. PO</th>
                <th>Vendor</th>
                <th>PIC</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((po) => {
                const statusConfig = PO_STATUS_LABELS[po.status] || { label: po.status, color: 'var(--text-muted)' };
                
                return (
                  <tr key={po.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{po.poNumber}</td>
                    <td>{po.vendor?.name || '-'}</td>
                    <td>{po.pic?.name || '-'}</td>
                    <td>
                      <span className="badge" style={{ background: `${statusConfig.color}15`, color: statusConfig.color, border: `1px solid ${statusConfig.color}30` }}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDate(po.date)}</td>
                    <td>
                      <Link href={`/po/${po.id}`} className="btn btn-secondary btn-sm">
                        Detail <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
