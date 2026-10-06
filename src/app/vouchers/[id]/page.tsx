'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  canApprove, canEdit, canDelete, canAmend, canInputJournal,
  canAddNote, canUpload, canDownload, canReplaceAttachment,
  STATUS_LABELS, ROLE_LABELS, getNextStatus,
} from '@/lib/workflow-engine';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { getBadgeClass, ACTION_LABELS } from '@/lib/ui-helpers';
import {
  ArrowLeft, CheckCircle, XCircle, Download, UploadCloud,
  MessageSquare, Edit, Trash2, FileText, Loader2, Replace, Eye, X
} from 'lucide-react';

export default function VoucherDetailPage() {
  const { currentRole, currentUser } = useAuth();
  const params = useParams<{ id: string }>();
  
  const [voucher, setVoucher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  
  const [remarksText, setRemarksText] = useState('');
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);

  // Revision State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState<'REVISION_VOUCHER' | 'REVISION_JOURNAL'>('REVISION_VOUCHER');
  const [revisionNotes, setRevisionNotes] = useState('');

  // Journal Entry State
  const [coas, setCoas] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [journalCoaId, setJournalCoaId] = useState('');
  const [journalCoaSearch, setJournalCoaSearch] = useState('');
  const [journalDescription, setJournalDescription] = useState('');
  const [journalDebit, setJournalDebit] = useState('');
  const [journalCredit, setJournalCredit] = useState('');
  const [journalDate, setJournalDate] = useState('');
  const [isSubmittingJournal, setIsSubmittingJournal] = useState(false);

  // Journal Entry Edit State
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [editJournalDate, setEditJournalDate] = useState('');
  const [editJournalCoaId, setEditJournalCoaId] = useState('');
  const [editJournalCoaSearch, setEditJournalCoaSearch] = useState('');
  const [editJournalDescription, setEditJournalDescription] = useState('');
  const [editJournalDebit, setEditJournalDebit] = useState('');
  const [editJournalCredit, setEditJournalCredit] = useState('');
  const [isUpdatingJournal, setIsUpdatingJournal] = useState(false);

  // Preview Attachment State
  const [previewAttachment, setPreviewAttachment] = useState<{url: string, type: string, name: string} | null>(null);
  const [previewError, setPreviewError] = useState(false);

  const fetchVoucher = async () => {
    try {
      const res = await fetch(`/api/vouchers/${params.id}`);
      if (!res.ok) throw new Error('Voucher not found');
      const data = await res.json();
      setVoucher(data);
      setRemarksText(data.remarks || '');
      if (data.date) {
        setJournalDate(new Date(data.date).toISOString().substring(0, 10));
      } else {
        setJournalDate(new Date().toISOString().substring(0, 10));
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoas = async () => {
    try {
      const res = await fetch('/api/coas');
      if (res.ok) {
        setCoas(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/vendors');
      if (res.ok) {
        setVendors(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVoucher();
    fetchCoas();
    fetchVendors();
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <p>Memuat detail voucher...</p>
      </div>
    );
  }

  if (errorMsg || !voucher) {
    return (
      <div className="glass-panel empty-state">
        <XCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{errorMsg || 'Voucher tidak ditemukan'}</p>
        <Link href="/vouchers" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Kembali ke Daftar</Link>
      </div>
    );
  }

  // ─── Permissions (PRD §6, §10, §11, §13) ──────
  const showApprove = canApprove(voucher.status, currentRole);
  const showEdit = canEdit(voucher.status, currentRole);
  const showDelete = canDelete(voucher.status, currentRole);
  const showAmend = voucher.status === 'COMPLETED' && canAmend(currentRole);
  const showFinishAmend = voucher.status === 'AMENDING' && canAmend(currentRole);
  const showJournal = canInputJournal(currentRole, voucher.status) && voucher.status !== 'CANCELLED';
  const showAddNote = canAddNote(currentRole); // Acc 1/2/3 only
  const showUpload = canUpload(currentRole); // All roles per PRD §11
  const showDownload = canDownload(currentRole); // All roles per PRD §6
  const showReplace = canReplaceAttachment(currentRole); // All roles per PRD §11
  const isTerminal = voucher.status === 'COMPLETED' || voucher.status === 'CANCELLED' || voucher.status === 'AMENDING';
  const showJournalSection = ['ACCOUNTING_1', 'ACCOUNTING_2', 'ACCOUNTING_3', 'ADMIN', 'FINANCE'].includes(currentRole);

  const showRevisionBtn = ['ACCOUNTING_1', 'ACCOUNTING_2', 'ACCOUNTING_3'].includes(currentRole) && 
                          !['COMPLETED', 'CANCELLED', 'REVISION_VOUCHER', 'REVISION_JOURNAL', 'AMENDING', 'DRAFT', 'WAITING_APPROVAL'].includes(voucher.status);
                          
  const showCancelRevisionBtn = ['REVISION_VOUCHER', 'REVISION_JOURNAL'].includes(voucher.status) && 
    (voucher.revisions?.some((r: any) => r.status === 'OPEN' && (r.requestedById === currentUser?.id || currentRole === 'ADMIN')));

  // ─── Action Handlers ───────────────────────────
  
  const performAction = async (action: string, extraData: any = {}) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/vouchers/${params.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          userRole: currentRole,
          userId: currentUser.id,
          ...extraData
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Gagal memproses ${action}`);
      }
      
      // Refresh the UI
      await fetchVoucher();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleApprove = () => {
    if (voucher.journals && voucher.journals.length > 0) {
      const totalDebit = voucher.journals.reduce((sum: number, j: any) => sum + j.debit, 0);
      const totalCredit = voucher.journals.reduce((sum: number, j: any) => sum + j.credit, 0);
      if (totalDebit !== totalCredit) {
        alert(`WARNING: Journal Entries belum balance!\n\nTotal Debit: Rp ${formatCurrency(totalDebit)}\nTotal Kredit: Rp ${formatCurrency(totalCredit)}\n\nHarap pastikan jurnal sudah balance (Debit = Kredit) sebelum melakukan Approve.`);
        return;
      }
    }
    performAction('APPROVE', { notes: `Disetujui oleh ${ROLE_LABELS[currentRole]}` });
  };

  const handleCancel = () => {
    if (!confirm('Apakah Anda yakin ingin membatalkan voucher ini?')) return;
    performAction('SOFT_DELETE', { notes: 'Voucher dibatalkan (soft delete)' });
  };

  const handleRestore = () => {
    if (!confirm('Apakah Anda yakin ingin memulihkan (restore) voucher ini ke status sebelumnya?')) return;
    performAction('RESTORE', { notes: 'Voucher dipulihkan (Restore)' });
  };

  const handleAmend = () => {
    if (!confirm('Apakah Anda yakin ingin melakukan Amendment (revisi) pada voucher ini? Status akan menjadi Sedang Direvisi (AMENDING).')) return;
    performAction('AMENDMENT', { notes: 'Melakukan Amendment (Sedang Direvisi)' });
  };

  const handleFinishAmend = () => {
    if (!confirm('Apakah Anda yakin selesai melakukan Amendment? Status akan kembali menjadi COMPLETED.')) return;
    performAction('FINISH_AMENDMENT', { notes: 'Selesai Melakukan Revisi' });
  };

  const handleSubmitRevision = () => {
    if (!revisionNotes.trim()) {
      alert("Catatan revisi wajib diisi!");
      return;
    }
    performAction('REVISION', { 
      revisionTarget: revisionTarget,
      notes: revisionNotes 
    });
    setShowRevisionModal(false);
  };
  
  const handleCancelRevision = () => {
    if (!confirm('Apakah Anda yakin ingin membatalkan status revisi ini dan mengembalikannya ke status sebelumnya?')) return;
    performAction('CANCEL_REVISION');
  };

  const handleSendToDrive = async () => {
    if (!confirm('Kirim PDF Voucher ini ke Google Drive?')) return;
    setActionLoading('DRIVE');
    try {
      const res = await fetch(`/api/vouchers/${params.id}/send-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: currentRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim ke Drive');
      alert(`Berhasil! File tersimpan di Google Drive.\nLink: ${data.link}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleHardDelete = async () => {
    if (!confirm('PERINGATAN: Anda akan menghapus data ini secara permanen dari database. Lanjutkan?')) return;
    setActionLoading('HARD_DELETE');
    try {
      const res = await fetch(`/api/vouchers/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus voucher secara permanen');
      window.location.href = '/vouchers';
    } catch (err: any) {
      alert(err.message);
      setActionLoading('');
    }
  };

  const handleAddNote = () => {
    if (noteText.trim()) {
      performAction('NOTE', { notes: noteText });
      setNoteText('');
      setShowNoteInput(false);
    }
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setActionLoading('UPLOAD');
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userRole', currentRole);
        formData.append('userId', currentUser.id);

        const res = await fetch(`/api/vouchers/${params.id}/attachments`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Gagal mengupload lampiran');
        
        await fetchVoucher();
      } catch (err: any) {
        alert(err.message);
      } finally {
        setActionLoading('');
      }
    };
    input.click();
  };

  const handleAddJournal = async () => {
    if (!journalCoaId || (!journalDebit && !journalCredit)) return;
    setIsSubmittingJournal(true);
    try {
      const res = await fetch(`/api/vouchers/${params.id}/journals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coaId: journalCoaId,
          description: journalDescription,
          debit: Number(journalDebit) || 0,
          credit: Number(journalCredit) || 0,
          date: journalDate,
        })
      });
      if (!res.ok) throw new Error('Gagal menambahkan journal entry');
      
      setJournalCoaId('');
      setJournalCoaSearch('');
      setJournalDescription('');
      setJournalDebit('');
      setJournalCredit('');
      await fetchVoucher();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingJournal(false);
    }
  };

  const startEditJournal = (j: any) => {
    setEditingJournalId(j.id);
    setEditJournalDate(j.date ? new Date(j.date).toISOString().substring(0, 10) : '');
    setEditJournalCoaId(j.coaId);
    setEditJournalCoaSearch(j.coa ? `${j.coa.accountNumber} - ${j.coa.accountName}` : '');
    setEditJournalDescription(j.description || '');
    setEditJournalDebit(j.debit.toString());
    setEditJournalCredit(j.credit.toString());
  };

  const handleUpdateJournal = async () => {
    if (!editJournalCoaId || (!editJournalDebit && !editJournalCredit)) return;
    setIsUpdatingJournal(true);
    try {
      const res = await fetch(`/api/vouchers/${params.id}/journals/${editingJournalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coaId: editJournalCoaId,
          description: editJournalDescription,
          debit: Number(editJournalDebit) || 0,
          credit: Number(editJournalCredit) || 0,
          date: editJournalDate,
        })
      });
      if (!res.ok) throw new Error('Gagal mengupdate journal entry');
      
      setEditingJournalId(null);
      await fetchVoucher();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdatingJournal(false);
    }
  };

  const handleDeleteJournal = async (journalId: string) => {
    if (!confirm('Hapus jurnal ini?')) return;
    try {
      const res = await fetch(`/api/vouchers/${params.id}/journals/${journalId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus jurnal');
      await fetchVoucher();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const renderDifferences = (beforeStr: string, afterStr: string) => {
    try {
      if (!beforeStr || !afterStr) return <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Data snapshot tidak lengkap.</p>;
      const b = JSON.parse(beforeStr);
      const a = JSON.parse(afterStr);
      
      const changes: React.ReactNode[] = [];
      
      const compareField = (key: string, label: string, formatter = (val: any) => val) => {
        if (b[key] !== a[key]) {
          changes.push(
            <div key={key} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{label}: </span>
              <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>{formatter(b[key])}</span>
              <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>→</span>
              <span style={{ color: 'var(--success)', fontWeight: 500 }}>{formatter(a[key])}</span>
            </div>
          );
        }
      };

      compareField('date', 'Tanggal', (v) => v ? new Date(v).toLocaleDateString('id-ID') : '-');
      
      if (b.vendorId !== a.vendorId) {
        const bVendorObj = vendors.find((v: any) => v.id === b.vendorId);
        const aVendorObj = vendors.find((v: any) => v.id === a.vendorId);
        const oldVendor = b.vendor?.name || bVendorObj?.name || b.accountName || '-';
        const newVendor = a.vendor?.name || aVendorObj?.name || a.accountName || '-';
        changes.push(
          <div key="vendor" style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Nama Vendor: </span>
            <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>{oldVendor}</span>
            <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>→</span>
            <span style={{ color: 'var(--success)', fontWeight: 500 }}>{newVendor}</span>
          </div>
        );
      }

      compareField('discountPercentage', 'Diskon (%)', (v) => v || 0);
      compareField('ppnPercentage', 'PPN (%)', (v) => v || 0);
      compareField('pphPercentage', 'PPh (%)', (v) => v || 0);
      compareField('nominal', 'Subtotal', (v) => `Rp ${formatCurrency(v || 0)}`);
      compareField('grandTotal', 'Grand Total', (v) => `Rp ${formatCurrency(v || 0)}`);

      // Compare items specifically
      if (b.items && a.items) {
        const maxLen = Math.max(b.items.length, a.items.length);
        for (let i = 0; i < maxLen; i++) {
          const oldItem = b.items[i];
          const newItem = a.items[i];
          
          if (!oldItem) {
             changes.push(<div key={`item_new_${i}`} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}><span style={{ fontWeight: 600, color: 'var(--success)' }}>+ Tambah Item Baru: </span><span>{newItem.description}</span></div>);
          } else if (!newItem) {
             changes.push(<div key={`item_del_${i}`} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}><span style={{ fontWeight: 600, color: 'var(--danger)' }}>- Hapus Item: </span><span style={{textDecoration: 'line-through'}}>{oldItem.description}</span></div>);
          } else {
             // Both exist, compare fields
             const itemChanges = [];
             if (oldItem.description !== newItem.description) {
                itemChanges.push(
                  <div key={`desc_${i}`}>
                    Keterangan: <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>{oldItem.description}</span> → <span style={{ color: 'var(--success)' }}>{newItem.description}</span>
                  </div>
                );
             }
             if (oldItem.qty !== newItem.qty) {
                itemChanges.push(
                  <div key={`qty_${i}`}>
                    Qty: <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>{oldItem.qty}</span> → <span style={{ color: 'var(--success)' }}>{newItem.qty}</span>
                  </div>
                );
             }
             if (oldItem.price !== newItem.price) {
                itemChanges.push(
                  <div key={`price_${i}`}>
                    Harga: <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>Rp {formatCurrency(oldItem.price || 0)}</span> → <span style={{ color: 'var(--success)' }}>Rp {formatCurrency(newItem.price || 0)}</span>
                  </div>
                );
             }
             if (oldItem.nominal !== newItem.nominal) {
                itemChanges.push(
                  <div key={`nom_${i}`}>
                    Nominal: <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>Rp {formatCurrency(oldItem.nominal || 0)}</span> → <span style={{ color: 'var(--success)' }}>Rp {formatCurrency(newItem.nominal || 0)}</span>
                  </div>
                );
             }
             
             if (itemChanges.length > 0) {
               changes.push(
                 <div key={`item_mod_${i}`} style={{ marginBottom: '0.75rem', fontSize: '0.85rem', paddingLeft: '0.75rem', borderLeft: '2px solid var(--primary-light)' }}>
                   <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Perubahan Item #{i+1}:</div>
                   {itemChanges}
                 </div>
               );
             }
          }
        }
      }

      if (changes.length === 0) {
        return <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Tidak ada perubahan data formulir spesifik (mungkin perubahan lampiran).</p>;
      }
      
      return <div>{changes}</div>;
    } catch (e) {
      return <p style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Gagal membaca perbedaan data.</p>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/vouchers" className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{voucher.voucherNumber}</h1>
              <span className={getBadgeClass(voucher.status)}>{STATUS_LABELS[voucher.status]}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{voucher.items?.[0]?.description || 'Voucher Pengeluaran'} {voucher.items?.length > 1 ? `(+${voucher.items.length - 1} item lainnya)` : ''}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {showEdit && (
            <Link href={`/vouchers/${params.id}/edit`}>
              <button className="btn btn-secondary btn-sm">
                <Edit size={16} /> Edit Data Voucher
              </button>
            </Link>
          )}
          {showDownload && (
            <a href={`/api/vouchers/${params.id}/pdf`} download={`Voucher_${voucher.voucherNumber}.pdf`}>
              <button className="btn btn-secondary btn-sm">
                <Download size={16} /> Download PDF
              </button>
            </a>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Left: Voucher Details */}
        <div>
          {/* Info Card */}
          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Detail Voucher</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vendor / Kepada</p>
                <p style={{ fontWeight: 600 }}>{voucher.vendor?.name}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tanggal</p>
                <p style={{ fontWeight: 600 }}>{formatDate(voucher.date)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bank</p>
                <p style={{ fontWeight: 600 }}>{voucher.bankName}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No. Rekening</p>
                <p style={{ fontWeight: 600 }}>{voucher.accountNumber}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nama Rekening</p>
                <p style={{ fontWeight: 600 }}>{voucher.accountName}</p>
              </div>
              
              {/* Remarks Section */}
              <div style={{ gridColumn: '1 / -1', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Catatan Voucher (Remarks untuk PDF)</p>
                  {(currentRole === 'ADMIN' || currentRole === 'ACCOUNTING_2') && !isTerminal && !isEditingRemarks && (
                    <button className="btn btn-sm" style={{ background: 'transparent', padding: '0 0.5rem' }} onClick={() => setIsEditingRemarks(true)}>
                      <Edit size={12} style={{ marginRight: '4px' }} /> Edit
                    </button>
                  )}
                </div>
                {isEditingRemarks ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <textarea 
                      className="input-field" 
                      rows={4} 
                      value={remarksText} 
                      onChange={e => setRemarksText(e.target.value)}
                      placeholder="Masukkan catatan... (mendukung banyak baris/list)"
                      style={{ fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => {
                        setIsEditingRemarks(false);
                        setRemarksText(voucher.remarks || '');
                      }}>Batal</button>
                      <button className="btn btn-primary btn-sm" onClick={async () => {
                        await performAction('UPDATE_REMARKS', { remarks: remarksText });
                        setIsEditingRemarks(false);
                      }} disabled={actionLoading === 'UPDATE_REMARKS'}>
                        {actionLoading === 'UPDATE_REMARKS' ? 'Menyimpan...' : 'Simpan'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{voucher.remarks || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Tidak ada catatan.</span>}</p>
                )}
              </div>
            </div>

            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Detail Keterangan</h4>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                  <tr>
                    <th style={{ padding: '0.5rem 1rem' }}>No</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Jenis</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Keterangan</th>
                    <th style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>Harga Satuan</th>
                    <th style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.items?.map((item: any, idx: number) => (
                    <tr key={item.id}>
                      <td style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          background: item.type === 'JASA' ? '#e0e7ff' : '#f3f4f6', 
                          color: item.type === 'JASA' ? '#4f46e5' : '#4b5563',
                          fontWeight: 500 
                        }}>{item.type || 'BARANG'}</span>
                      </td>
                      <td style={{ padding: '0.5rem 1rem', fontWeight: 500 }}>{item.description}</td>
                      <td style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>{item.qty} {item.unit}</td>
                      <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>Rp {formatCurrency(item.price)}</td>
                      <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: item.nominal < 0 ? 'var(--danger)' : 'inherit', fontWeight: 500 }}>
                        Rp {formatCurrency(item.nominal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '1.25rem 1rem', background: 'rgba(16, 185, 129, 0.03)', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '50%', marginLeft: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>Rp {formatCurrency(voucher.nominal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Diskon ({voucher.discountPercentage || 0}%):</span>
                    <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
                      - Rp {formatCurrency((voucher.nominal || 0) * ((voucher.discountPercentage || 0) / 100))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Dasar Pengenaan Pajak (DPP):</span>
                    <span style={{ fontWeight: 600 }}>
                      Rp {formatCurrency((voucher.nominal || 0) - ((voucher.nominal || 0) * ((voucher.discountPercentage || 0) / 100)))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>PPN ({voucher.ppnPercentage || 0}%):</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      + Rp {formatCurrency(((voucher.nominal || 0) - ((voucher.nominal || 0) * ((voucher.discountPercentage || 0) / 100))) * ((voucher.ppnPercentage || 0) / 100))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Jasa:</span>
                    <span style={{ fontWeight: 600 }}>
                      Rp {formatCurrency(voucher.items?.filter((i: any) => i.type === 'JASA').reduce((acc: number, curr: any) => acc + curr.nominal, 0) || 0)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>PPh ({voucher.pphPercentage || 0}% dari Jasa):</span>
                    <span style={{ fontWeight: 600, color: 'var(--warning)' }}>
                      - Rp {formatCurrency((voucher.items?.filter((i: any) => i.type === 'JASA').reduce((acc: number, curr: any) => acc + curr.nominal, 0) || 0) * ((voucher.pphPercentage || 0) / 100))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Grand Total:</span>
                    <span style={{ fontWeight: 700, color: (voucher.grandTotal || voucher.nominal) < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      Rp {formatCurrency(voucher.grandTotal || voucher.nominal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments — PRD §11: all roles can upload/replace/download */}
          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Lampiran ({voucher.attachments?.length || 0})</h3>
              {showUpload && !isTerminal && (
                <button className="btn btn-secondary btn-sm" onClick={handleUpload} disabled={actionLoading === 'UPLOAD'}>
                  {actionLoading === 'UPLOAD' ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} Upload
                </button>
              )}
            </div>
            {!voucher.attachments || voucher.attachments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                Belum ada lampiran.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {voucher.attachments.map((att: any) => {
                  const isPreviewable = ['.pdf', '.jpg', '.jpeg', '.png'].some(ext => att.originalName.toLowerCase().endsWith(ext));
                  return (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.6)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={20} color="var(--primary)" />
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{att.originalName}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {formatDateTime(att.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {isPreviewable && (
                          <button 
                            className="btn btn-secondary btn-sm" 
                            title="Preview" 
                            onClick={() => {
                              setPreviewError(false);
                              setPreviewAttachment({
                                url: att.filePath,
                                type: att.originalName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image',
                                name: att.originalName
                              });
                            }}
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        {showDownload && (
                          <a href={att.filePath} download={att.originalName}>
                            <button className="btn btn-secondary btn-sm" title="Download"><Download size={14} /></button>
                          </a>
                        )}
                        {showReplace && !isTerminal && (
                          <button className="btn btn-secondary btn-sm" title="Replace" onClick={() => handleUpload()}><Replace size={14} /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Journal Entries */}
          {showJournalSection && (
            <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Journal Entries ({voucher.journals?.length || 0})</h3>
              
              {voucher.journals && voucher.journals.length > 0 ? (
                <table className="data-table" style={{ marginBottom: '1rem' }}>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>COA</th>
                      <th>Nama Akun</th>
                      <th>Keterangan</th>
                      <th>Debit</th>
                      <th>Kredit</th>
                      {showJournal && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {voucher.journals.map((j: any) => (
                    j.id === editingJournalId ? (
                      <tr key={j.id} style={{ background: 'rgba(59,130,246,0.05)' }}>
                        <td style={{ padding: '0.25rem 0.5rem' }}><input type="date" className="input-field" value={editJournalDate} onChange={e => setEditJournalDate(e.target.value)} style={{ marginBottom: 0, padding: '0.2rem', fontSize: '0.8rem', minWidth: '100px' }} /></td>
                        <td colSpan={2} style={{ padding: '0.25rem 0.5rem' }}>
                          <input 
                            list="coa-options"
                            type="text"
                            className="input-field" 
                            placeholder="Pilih atau Ketik COA..."
                            value={editJournalCoaSearch} 
                            onChange={e => {
                              setEditJournalCoaSearch(e.target.value);
                              const match = coas.find(c => `${c.accountNumber} - ${c.accountName}` === e.target.value && c.fiscalYear === voucher?.fiscalYear);
                              setEditJournalCoaId(match ? match.id : '');
                            }} 
                            style={{ marginBottom: 0, padding: '0.2rem', fontSize: '0.8rem', minWidth: '150px' }} 
                          />
                        </td>
                        <td style={{ padding: '0.25rem 0.5rem' }}><input type="text" className="input-field" value={editJournalDescription} onChange={e => setEditJournalDescription(e.target.value)} style={{ marginBottom: 0, padding: '0.2rem', fontSize: '0.8rem', minWidth: '120px' }} /></td>
                        <td style={{ padding: '0.25rem 0.5rem' }}><input type="number" className="input-field" value={editJournalDebit} onChange={e => setEditJournalDebit(e.target.value)} style={{ marginBottom: 0, padding: '0.2rem', fontSize: '0.8rem', minWidth: '80px' }} /></td>
                        <td style={{ padding: '0.25rem 0.5rem' }}><input type="number" className="input-field" value={editJournalCredit} onChange={e => setEditJournalCredit(e.target.value)} style={{ marginBottom: 0, padding: '0.2rem', fontSize: '0.8rem', minWidth: '80px' }} /></td>
                        {showJournal && (
                          <td style={{ padding: '0.25rem 0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-primary btn-sm" onClick={handleUpdateJournal} disabled={isUpdatingJournal} style={{ padding: '0.2rem 0.4rem' }}>✓</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingJournalId(null)} style={{ padding: '0.2rem 0.4rem' }}>✕</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ) : (
                      <tr key={j.id}>
                        <td>{formatDate(j.date)}</td>
                        <td>{j.coa?.accountNumber}</td>
                        <td>{j.coa?.accountName}</td>
                        <td>{j.description || '-'}</td>
                        <td>Rp {formatCurrency(j.debit)}</td>
                        <td>Rp {formatCurrency(j.credit)}</td>
                        {showJournal && (
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-sm" style={{ color: 'var(--primary)', background: 'transparent', padding: '0.25rem' }} onClick={() => startEditJournal(j)}>
                                <Edit size={14} />
                              </button>
                              <button className="btn btn-sm" style={{ color: 'var(--danger)', background: 'transparent', padding: '0.25rem' }} onClick={() => handleDeleteJournal(j.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Belum ada journal entry.</p>
              )}

              {/* Input Form for Accounting 2 */}
              {showJournal && (
                <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Input Journal Baru</p>
                  
                  {/* Suggestion Chips */}
                  {voucher.items && voucher.items.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Tarik dari rincian biaya (klik untuk mengisi otomatis):</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {voucher.items.map((item: any) => (
                          <button
                            key={item.id}
                            className="btn btn-sm"
                            style={{ background: 'white', border: '1px dashed var(--primary)', color: 'var(--primary)', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              setJournalDescription(item.description);
                              if (item.nominal >= 0) {
                                setJournalDebit(item.nominal.toString());
                                setJournalCredit('');
                              } else {
                                setJournalCredit(Math.abs(item.nominal).toString());
                                setJournalDebit('');
                              }
                            }}
                          >
                            + {item.description}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input type="date" className="input-field" value={journalDate} onChange={e => setJournalDate(e.target.value)} style={{ marginBottom: 0 }} />
                    <input 
                      list="coa-options"
                      type="text"
                      className="input-field" 
                      placeholder="Pilih atau Ketik COA..."
                      value={journalCoaSearch} 
                      onChange={e => {
                        setJournalCoaSearch(e.target.value);
                        const match = coas.find(c => `${c.accountNumber} - ${c.accountName}` === e.target.value && c.fiscalYear === voucher?.fiscalYear);
                        setJournalCoaId(match ? match.id : '');
                      }} 
                      style={{ marginBottom: 0 }} 
                    />
                    <datalist id="coa-options">
                      {coas.filter(c => c.fiscalYear === voucher?.fiscalYear).map(c => (
                        <option key={c.id} value={`${c.accountNumber} - ${c.accountName}`} />
                      ))}
                    </datalist>
                    <input type="text" className="input-field" placeholder="Keterangan Jurnal" value={journalDescription} onChange={e => setJournalDescription(e.target.value)} style={{ marginBottom: 0 }} />
                    <input type="number" className="input-field" placeholder="Debit (Rp)" value={journalDebit} onChange={e => setJournalDebit(e.target.value)} style={{ marginBottom: 0 }} />
                    <input type="number" className="input-field" placeholder="Kredit (Rp)" value={journalCredit} onChange={e => setJournalCredit(e.target.value)} style={{ marginBottom: 0 }} />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleAddJournal} disabled={isSubmittingJournal || !journalCoaId}>
                    {isSubmittingJournal ? 'Menyimpan...' : '+ Tambah Baris Journal'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions + Timeline */}
        <div>
          {/* Action Buttons */}
          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Tindakan</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {showApprove && (
                <button className="btn btn-success" style={{ width: '100%' }} onClick={handleApprove}
                  disabled={actionLoading === 'APPROVE'}>
                  {actionLoading === 'APPROVE' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {actionLoading === 'APPROVE' ? 'Memproses...' : 'Approve'}
                </button>
              )}

              {showRevisionBtn && (
                <button className="btn btn-danger" style={{ width: '100%', background: 'var(--warning)', borderColor: 'var(--warning)', color: '#000' }} onClick={() => setShowRevisionModal(true)}>
                  <MessageSquare size={18} /> Ajukan Revisi
                </button>
              )}
              
              {showCancelRevisionBtn && (
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleCancelRevision} disabled={actionLoading === 'CANCEL_REVISION'}>
                   {actionLoading === 'CANCEL_REVISION' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                   {actionLoading === 'CANCEL_REVISION' ? 'Memproses...' : 'Batal Revisi'}
                </button>
              )}

              {showEdit && (!isTerminal || (voucher.status === 'COMPLETED' && currentRole === 'ADMIN')) && (
                <Link href={`/vouchers/${params.id}/edit`} className="btn btn-secondary" style={{ width: '100%' }}>
                  <Edit size={18} /> Edit Voucher
                </Link>
              )}

              {showDownload && (
                <Link href={`/api/vouchers/${voucher.id}/pdf`} target="_blank" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
                  <Download size={18} /> Download PDF
                </Link>
              )}

              {currentRole === 'ADMIN' && voucher.status === 'COMPLETED' && (
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSendToDrive} disabled={actionLoading === 'DRIVE'}>
                  {actionLoading === 'DRIVE' ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                  {actionLoading === 'DRIVE' ? 'Mengirim...' : 'Kirim PDF ke Drive'}
                </button>
              )}

              {showAddNote && (
                <>
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
                </>
              )}

              {showDelete && !isTerminal && (
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleCancel}
                  disabled={actionLoading === 'SOFT_DELETE'}>
                  {actionLoading === 'SOFT_DELETE' ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  {actionLoading === 'SOFT_DELETE' ? 'Memproses...' : 'Batalkan (Soft Delete)'}
                </button>
              )}

              {showAmend && (
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleAmend} disabled={actionLoading === 'AMENDMENT'}>
                  {actionLoading === 'AMENDMENT' ? <Loader2 size={18} className="animate-spin" /> : <Edit size={18} />}
                  {actionLoading === 'AMENDMENT' ? 'Memproses...' : 'Amendment'}
                </button>
              )}

              {showFinishAmend && (
                <button className="btn btn-success" style={{ width: '100%' }} onClick={handleFinishAmend} disabled={actionLoading === 'FINISH_AMENDMENT'}>
                  {actionLoading === 'FINISH_AMENDMENT' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {actionLoading === 'FINISH_AMENDMENT' ? 'Memproses...' : 'Selesai Revisi'}
                </button>
              )}

              {voucher.status === 'CANCELLED' && currentRole === 'ADMIN' && (
                <>
                  <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleRestore} disabled={actionLoading === 'RESTORE'}>
                    {actionLoading === 'RESTORE' ? <Loader2 size={18} className="animate-spin" /> : <Replace size={18} />}
                    {actionLoading === 'RESTORE' ? 'Memulihkan...' : 'Restore (Kembalikan)'}
                  </button>
                  <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleHardDelete} disabled={actionLoading === 'HARD_DELETE'}>
                    {actionLoading === 'HARD_DELETE' ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    {actionLoading === 'HARD_DELETE' ? 'Menghapus...' : 'Hapus Permanen'}
                  </button>
                </>
              )}

              {!showApprove && !showEdit && !showDelete && !showAmend && !showFinishAmend && !showAddNote && !showRevisionBtn && voucher.status === 'COMPLETED' && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  Voucher sudah selesai. Tidak ada tindakan tersedia.
                </p>
              )}
            </div>
          </div>
          
          {/* Active Revision Banner */}
          {['REVISION_VOUCHER', 'REVISION_JOURNAL'].includes(voucher.status) && voucher.revisions?.filter((r:any) => r.status === 'OPEN').map((rev: any) => (
             <div key={rev.id} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <XCircle size={18} />
                  Sedang dalam Revisi
                </div>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <strong>Pemohon:</strong> {rev.requestedBy?.name} <br/>
                  <strong>Jenis:</strong> {rev.type === 'REVISION_VOUCHER' ? 'Revisi Data/Lampiran' : 'Revisi Jurnal'}
                </p>
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', fontStyle: 'italic', borderLeft: '3px solid var(--danger)' }}>
                  &ldquo;{rev.notes}&rdquo;
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Mohon perbaiki data sesuai catatan di atas, kemudian klik <strong>Approve</strong> untuk meneruskan kembali ke alur normal.
                </p>
             </div>
          ))}

          {/* Audit Log Timeline — PRD §14: visible to ALL roles */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem' }}>Riwayat / Timeline</h3>

            <div className="timeline">
              {voucher.auditLogs?.map((log: any) => {
                const config = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-muted)' };
                return (
                  <div key={log.id} className="timeline-item">
                    <div className="timeline-dot" style={{
                      background: config.color,
                      border: `3px solid ${config.color}33`,
                    }} />
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        <span style={{ color: config.color }}>{config.label}</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> oleh </span>
                        <span>{log.user?.name || 'Sistem'}</span>
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {log.user?.role ? (ROLE_LABELS[log.user.role] || log.user.role) : ''} • {formatDateTime(log.createdAt)}
                      </p>
                      {log.notes && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px', fontStyle: 'italic' }}>
                          &ldquo;{log.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Revision History Tab / Section */}
          {voucher.revisions?.length > 0 && (
            <div className="glass-panel" style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Riwayat Revisi</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {voucher.revisions.map((rev: any) => (
                  <div key={rev.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{rev.type === 'REVISION_VOUCHER' ? 'Revisi Data/Lampiran' : 'Revisi Jurnal'}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Oleh: {rev.requestedBy?.name}</span>
                      </div>
                      <span className={getBadgeClass(rev.status === 'OPEN' ? 'HOLD' : (rev.status === 'RESOLVED' ? 'COMPLETED' : 'CANCELLED'))}>
                        {rev.status}
                      </span>
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>&ldquo;{rev.notes}&rdquo;</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tgl Pengajuan: {formatDateTime(rev.createdAt)}</p>
                      {rev.resolvedAt && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tgl Diselesaikan: {formatDateTime(rev.resolvedAt)}</p>
                      )}
                      
                      {/* Before / After Snapshots Collapsible */}
                      <details style={{ marginTop: '1rem', cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>Lihat Perubahan (Before/After)</summary>
                        <div style={{ padding: '1rem', marginTop: '1rem', background: 'rgba(255,255,255,0.5)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          {rev.afterSnapshot ? renderDifferences(rev.beforeSnapshot, rev.afterSnapshot) : <p style={{fontSize:'0.8rem', color:'var(--warning)'}}>Revisi belum diselesaikan (belum ada After Snapshot).</p>}
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Revision Modal */}
      {showRevisionModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: 'var(--surface-solid)', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid var(--border)', transform: 'translateY(0)', animation: 'slideUp 0.3s ease-out' }}>
            <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)', fontSize: '1.4rem' }}>
              <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <Edit size={20} color="var(--primary)" />
              </div>
              Ajukan Revisi
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Pilih target dan berikan instruksi revisi dengan jelas.</p>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Target Revisi *</label>
              <select className="input-field" value={revisionTarget} onChange={(e: any) => setRevisionTarget(e.target.value)} style={{ background: 'var(--bg)', cursor: 'pointer' }}>
                <option value="REVISION_VOUCHER">Revisi Data/Lampiran Voucher (Kembali ke Admin)</option>
                <option value="REVISION_JOURNAL">Revisi Journal Entries (Kembali ke Accounting 2)</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Catatan Revisi *</label>
              <textarea 
                className="input-field" 
                rows={4} 
                placeholder="Misal: 'Ubah keterangan baju menjadi celana' atau 'Lampiran invoice buram, mohon upload ulang'..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                style={{ background: 'var(--bg)', resize: 'none' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowRevisionModal(false)} style={{ padding: '0.6rem 1.25rem' }}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmitRevision} disabled={!revisionNotes.trim() || actionLoading === 'REVISION'} style={{ padding: '0.6rem 1.25rem' }}>
                {actionLoading === 'REVISION' ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
                {actionLoading === 'REVISION' ? 'Memproses...' : 'Kirim Revisi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewAttachment && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.9)', color: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{previewAttachment.name}</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href={previewAttachment.url} download={previewAttachment.name} className="btn btn-primary btn-sm">
                <Download size={16} /> Download
              </a>
              <button className="btn btn-secondary btn-sm" onClick={() => setPreviewAttachment(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                <X size={16} /> Tutup
              </button>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', padding: '1rem' }}>
            {previewError ? (
              <div style={{ textAlign: 'center', background: 'white', padding: '2rem', borderRadius: '8px' }}>
                <XCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
                <h4 style={{ marginBottom: '0.5rem' }}>Preview tidak tersedia</h4>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '300px' }}>
                  File ini mungkin korup atau formatnya tidak dapat ditampilkan langsung oleh browser Anda.
                </p>
                <a href={previewAttachment.url} download={previewAttachment.name} className="btn btn-primary">
                  Download File Saja
                </a>
              </div>
            ) : previewAttachment.type === 'application/pdf' ? (
              <iframe 
                src={previewAttachment.url} 
                style={{ width: '100%', height: '100%', border: 'none', background: 'white', borderRadius: '4px' }} 
                onError={() => setPreviewError(true)}
              />
            ) : (
              <img 
                src={previewAttachment.url} 
                alt={previewAttachment.name} 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', background: 'transparent' }} 
                onError={() => setPreviewError(true)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
