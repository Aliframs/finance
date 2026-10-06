'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { PO_STATUS_LABELS, canApprovePO, canRejectPO, canDeletePO } from '@/lib/po-workflow-engine';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { ArrowLeft, CheckCircle, XCircle, Download, UploadCloud, MessageSquare, Trash2, FileText, Loader2, Edit } from 'lucide-react';
import { ACTION_LABELS } from '@/lib/ui-helpers';

export default function PODetailPage() {
  const { currentRole, currentUser } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const fetchPO = async () => {
    try {
      const res = await fetch(`/api/po/${params.id}`);
      if (!res.ok) throw new Error('PO not found');
      const data = await res.json();
      setPo(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPO();
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <p>Memuat detail PO...</p>
      </div>
    );
  }

  if (errorMsg || !po) {
    return (
      <div className="glass-panel empty-state">
        <XCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{errorMsg || 'PO tidak ditemukan'}</p>
        <Link href="/po" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Kembali ke Daftar</Link>
      </div>
    );
  }

  const isPIC = po.picId === currentUser?.id;
  const showApprove = canApprovePO(po.status, currentRole, isPIC);
  const showReject = canRejectPO(po.status, currentRole, isPIC);
  const showDelete = canDeletePO(po.status, currentRole);
  const showEdit = po.status === 'DRAFT' && currentRole === 'ADMIN';
  
  const performAction = async (action: string, extraData: any = {}) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/po/${params.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userRole: currentRole,
          userId: currentUser.id,
          ...extraData
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Gagal memproses ${action}`);
      }
      await fetchPO();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleApprove = () => {
    const actionText = po.status === 'DRAFT' ? 'mengajukan' : 'menyetujui';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} PO ini?`)) return;
    performAction('APPROVE', { notes: po.status === 'DRAFT' ? 'Diajukan ke PIC' : 'Disetujui' });
  };

  const handleReject = () => {
    const reason = prompt('Alasan penolakan PO:');
    if (reason === null) return;
    performAction('REJECT', { notes: reason || 'Ditolak tanpa alasan' });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    performAction('NOTE', { notes: noteText }).then(() => {
      setNoteText('');
      setShowNoteInput(false);
    });
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus PO ini secara permanen?')) return;
    setActionLoading('DELETE');
    try {
      const res = await fetch(`/api/po/${params.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: currentRole })
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      router.push('/po');
    } catch (err: any) {
      alert(err.message);
      setActionLoading('');
    }
  };

  const statusConfig = PO_STATUS_LABELS[po.status] || { label: po.status, color: 'var(--text-muted)' };
  const totalItemNominal = po.items.reduce((sum: number, item: any) => sum + item.nominal, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/po" className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.5rem', margin: 0 }}>PO: {po.poNumber}</h1>
              <span className="badge" style={{ background: `${statusConfig.color}15`, color: statusConfig.color, border: `1px solid ${statusConfig.color}30` }}>
                {statusConfig.label}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Dibuat pada: {formatDateTime(po.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              Informasi Purchase Order
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Vendor / Kepada</p>
                <p style={{ fontWeight: 600, fontSize: '1.05rem' }}>{po.vendor?.name || '-'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>PIC (Pengaju)</p>
                <p style={{ fontWeight: 600, fontSize: '1.05rem' }}>{po.pic?.name || '-'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Tanggal PO</p>
                <p style={{ fontWeight: 500 }}>{formatDate(po.date)}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem' }}>Rincian Barang / Jasa</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Jenis</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Keterangan</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Qty/Unit</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Harga</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items?.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{item.type}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{item.description}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{item.qty} {item.unit}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{formatCurrency(item.price)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(item.nominal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Calculation Summary */}
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Total Item:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Rp {formatCurrency(totalItemNominal)}</span>
                  </div>
                  {(po.discountPercentage > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Diskon ({po.discountPercentage}%):</span>
                      <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- Rp {formatCurrency(totalItemNominal * (po.discountPercentage / 100))}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>DPP:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Rp {formatCurrency(totalItemNominal - (totalItemNominal * (po.discountPercentage / 100)))}</span>
                  </div>
                  {(po.ppnPercentage > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>PPN ({po.ppnPercentage}%):</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>+ Rp {formatCurrency((totalItemNominal - (totalItemNominal * (po.discountPercentage / 100))) * (po.ppnPercentage / 100))}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Total Jasa:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                      Rp {formatCurrency(po.items?.filter((i: any) => i.type === 'JASA').reduce((acc: number, curr: any) => acc + curr.nominal, 0) || 0)}
                    </span>
                  </div>
                  {(po.pphPercentage > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>PPh ({po.pphPercentage}% dari Jasa):</span>
                      <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
                        - Rp {formatCurrency((po.items?.filter((i: any) => i.type === 'JASA').reduce((acc: number, curr: any) => acc + curr.nominal, 0) || 0) * (po.pphPercentage / 100))}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                    <span>Grand Total:</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.2rem' }}>
                      Rp {formatCurrency(po.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div>
          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Tindakan</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {showApprove && (
                <button className="btn btn-success" style={{ width: '100%' }} onClick={handleApprove} disabled={actionLoading === 'APPROVE'}>
                  {actionLoading === 'APPROVE' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {actionLoading === 'APPROVE' ? 'Memproses...' : (po.status === 'DRAFT' ? 'Ajukan ke PIC' : 'Approve PO')}
                </button>
              )}

              {showEdit && (
                <Link href={`/po/${po.id}/edit`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
                  <Edit size={18} /> Edit PO
                </Link>
              )}

              {showReject && (
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleReject} disabled={actionLoading === 'REJECT'}>
                  {actionLoading === 'REJECT' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                  {actionLoading === 'REJECT' ? 'Memproses...' : 'Tolak PO'}
                </button>
              )}

              {po.status === 'COMPLETED' && (
                <Link href={`/api/po/${po.id}/pdf`} target="_blank" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
                  <Download size={18} /> Download PDF PO
                </Link>
              )}

              {!showNoteInput ? (
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowNoteInput(true)}>
                  <MessageSquare size={18} /> Tambah Catatan
                </button>
              ) : (
                <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <textarea className="input-field" rows={3} placeholder="Tulis catatan..."
                    value={noteText} onChange={(e) => setNoteText(e.target.value)} style={{ marginBottom: '0.5rem' }} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={!noteText.trim() || actionLoading === 'NOTE'}>
                      {actionLoading === 'NOTE' ? '...' : 'Kirim'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowNoteInput(false)}>Batal</button>
                  </div>
                </div>
              )}

              {showDelete && (
                <button className="btn btn-danger" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleDelete} disabled={actionLoading === 'DELETE'}>
                  {actionLoading === 'DELETE' ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  {actionLoading === 'DELETE' ? 'Menghapus...' : 'Hapus PO'}
                </button>
              )}
            </div>
          </div>

          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem' }}>Riwayat / Timeline</h3>
            <div className="timeline">
              {po.auditLogs?.map((log: any) => {
                const config = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-muted)' };
                return (
                  <div key={log.id} className="timeline-item">
                    <div className="timeline-dot" style={{
                      background: config.color,
                      border: `3px solid ${config.color}33`,
                    }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                        {config.label} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>oleh</span> {log.user.name}
                      </p>
                      {log.notes && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text)', background: 'var(--background)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          "{log.notes}"
                        </p>
                      )}
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {po.auditLogs?.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Belum ada riwayat.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
