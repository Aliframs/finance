'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { parseNominal, formatCurrency } from '@/lib/utils';
import { canEdit } from '@/lib/workflow-engine';
import { ArrowLeft, Save, Loader2, XCircle, Plus, Lock } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function EditVoucherPage() {
  const { currentRole } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  const [loadingVoucher, setLoadingVoucher] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [voucherNumber, setVoucherNumber] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('PENGELUARAN');
  const [customType, setCustomType] = useState('');
  const [items, setItems] = useState<{ id: string; description: string; type: string; unit: string; qty: string; priceInput: string }[]>([
    { id: 'item-1', description: '', type: 'BARANG', unit: 'pcs', qty: '1', priceInput: '' }
  ]);
  
  // Tax / Calculation State
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [ppnPercentage, setPpnPercentage] = useState('0');
  const [pphPercentage, setPphPercentage] = useState('0');
  const [remarks, setRemarks] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/vendors')
      .then(res => res.json())
      .then(data => {
        setVendors(Array.isArray(data) ? data : []);
        setLoadingVendors(false);
      });

    fetch(`/api/vouchers/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Voucher tidak ditemukan');
        return res.json();
      })
      .then(data => {
        if (!canEdit(data.status, currentRole)) {
          setIsAuthorized(false);
          setLoadingVoucher(false);
          return;
        }
        setIsAuthorized(true);

        setVoucherNumber(data.voucherNumber);
        setVendorId(data.vendorId);
        setDate(new Date(data.date).toISOString().split('T')[0]);
        
        if (data.type === 'PENGELUARAN' || data.type === 'PEMASUKAN') {
          setType(data.type);
        } else if (data.type) {
          setType('LAINNYA');
          setCustomType(data.type);
        }

        if (data.items && data.items.length > 0) {
          setItems(data.items.map((it: any, i: number) => ({
            id: `item-${i}-${Date.now()}`,
            description: it.description,
            type: it.type || 'BARANG',
            unit: it.unit || 'pcs',
            qty: it.qty?.toString() || '1',
            priceInput: it.price ? it.price.toString() : (it.nominal / (it.qty || 1)).toString()
          })));
        }
        
        setDiscountPercentage(data.discountPercentage?.toString() || '0');
        setPpnPercentage(data.ppnPercentage?.toString() || '0');
        setPphPercentage(data.pphPercentage?.toString() || '0');
        setRemarks(data.remarks || '');

        setLoadingVoucher(false);
      })
      .catch(err => {
        setErrorMsg(err.message);
        setLoadingVoucher(false);
      });
  }, [params.id]);

  const selectedVendor = vendors.find(v => v.id === vendorId);

  const parsedItems = items.map(item => {
    const qty = parseInt(item.qty) || 1;
    const price = parseFloat(item.priceInput) || 0;
    return {
      type: item.type,
      description: item.description,
      unit: item.unit,
      qty: qty,
      price: price,
      nominal: qty * price
    };
  });
  
  const totalItemNominal = parsedItems.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalJasaNominal = parsedItems.filter(i => i.type === 'JASA').reduce((acc, curr) => acc + curr.nominal, 0);
  
  const parsedDiscountPercent = parseFloat(discountPercentage) || 0;
  const parsedPpn = parseFloat(ppnPercentage) || 0;
  const parsedPph = parseFloat(pphPercentage) || 0;
  
  const discountNominal = totalItemNominal * (parsedDiscountPercent / 100);
  const dpp = totalItemNominal - discountNominal;
  const ppnAmount = dpp * (parsedPpn / 100);
  const pphAmount = totalJasaNominal * (parsedPph / 100); // PPh dipotong KHUSUS dari Jasa
  const grandTotal = dpp + ppnAmount - pphAmount;

  const addItem = () => {
    setItems([...items, { id: `item-${Date.now()}`, description: '', type: 'BARANG', unit: 'pcs', qty: '1', priceInput: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: 'description' | 'type' | 'unit' | 'qty' | 'priceInput', value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async () => {
    if (!vendorId || items.some(item => !item.description || item.priceInput === '')) return;
    
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const finalType = type === 'LAINNYA' ? (customType.toUpperCase() || 'LAINNYA') : type;

      const payload = {
        vendorId,
        date,
        type: finalType,
        items: parsedItems,
        nominal: totalItemNominal,
        discountPercentage: parsedDiscountPercent,
        ppnPercentage: parsedPpn,
        pphPercentage: parsedPph,
        grandTotal: grandTotal,
        remarks: remarks,
      };

      const res = await fetch(`/api/vouchers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Terjadi kesalahan saat mengedit voucher');
      }

      alert(`Voucher ${voucherNumber} berhasil diubah!`);
      router.push(`/vouchers/${params.id}`);
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingVoucher) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <p>Memuat data voucher...</p>
      </div>
    );
  }

  if (!isAuthorized && !loadingVoucher && !errorMsg) {
    return (
      <div className="glass-panel empty-state">
        <Lock size={48} color="var(--warning)" style={{ marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-main)', fontWeight: 600 }}>Akses Ditolak</p>
        <p style={{ color: 'var(--text-muted)' }}>Anda tidak memiliki izin untuk mengedit voucher pada status ini.</p>
        <Link href={`/vouchers/${params.id}`} className="btn btn-secondary" style={{ marginTop: '1rem' }}>Kembali</Link>
      </div>
    );
  }

  if (errorMsg && !voucherNumber) {
    return (
      <div className="glass-panel empty-state">
        <XCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{errorMsg}</p>
        <Link href={`/vouchers/${params.id}`} className="btn btn-secondary" style={{ marginTop: '1rem' }}>Kembali</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/vouchers/${params.id}`} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.15rem' }}>Edit Voucher {voucherNumber}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ubah informasi voucher dan rincian item.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!vendorId || items.some(i => !i.description || i.priceInput === '') || isSubmitting}>
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
          {errorMsg}
        </div>
      )}

      <div className="glass-panel">
        <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          Informasi Voucher
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="input-group">
            <label className="input-label">Nomor Voucher</label>
            <input type="text" className="input-field" value={voucherNumber} disabled style={{ background: 'var(--bg-muted)' }} />
          </div>
          <div className="input-group">
            <label className="input-label">Tanggal *</label>
            <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: '1.25rem' }}>
          <label className="input-label">Tipe Voucher *</label>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: type === 'PENGELUARAN' ? 1 : 0.6 }}>
              <input type="radio" name="voucherType" value="PENGELUARAN" checked={type === 'PENGELUARAN'} onChange={(e) => setType(e.target.value)} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }} />
              <span>Pengeluaran</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: type === 'PEMASUKAN' ? 1 : 0.6 }}>
              <input type="radio" name="voucherType" value="PEMASUKAN" checked={type === 'PEMASUKAN'} onChange={(e) => setType(e.target.value)} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }} />
              <span>Pemasukan</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: type === 'LAINNYA' ? 1 : 0.6 }}>
              <input type="radio" name="voucherType" value="LAINNYA" checked={type === 'LAINNYA'} onChange={(e) => setType(e.target.value)} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }} />
              <span>Lainnya (Custom)</span>
            </label>
          </div>
          {type === 'LAINNYA' && (
            <div style={{ marginTop: '0.75rem' }}>
              <input type="text" className="input-field" placeholder="Ketik tipe voucher di sini..." value={customType} onChange={(e) => setCustomType(e.target.value)} style={{ textTransform: 'uppercase' }} />
            </div>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">Kepada (Vendor) *</label>
          <select className="input-field" value={vendorId} onChange={(e) => setVendorId(e.target.value)} disabled={loadingVendors}>
            <option value="">{loadingVendors ? 'Memuat vendor...' : '— Pilih dari Master Data —'}</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {selectedVendor && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Bank (otomatis)</p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedVendor.bankName}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>No. Rekening (otomatis)</p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'monospace' }}>{selectedVendor.accountNumber}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Nama Rekening (otomatis)</p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedVendor.accountName}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>Item Keterangan</h3>
          <button className="btn btn-secondary btn-sm" onClick={addItem}>
            <Plus size={14} /> Tambah Keterangan
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item, index) => {
            const qty = parseFloat(item.qty) || 0;
            const price = parseFloat(item.priceInput) || 0;
            const nominal = qty * price;
            return (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', alignItems: 'flex-start', background: 'rgba(255,255,255,0.4)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Jenis</label>
                    <select className="input-field" value={item.type} onChange={(e) => handleItemChange(item.id, 'type', e.target.value)}>
                      <option value="BARANG">Barang</option>
                      <option value="JASA">Jasa</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Keterangan {index + 1} *</label>
                    <input className="input-field" placeholder="Deskripsi pengeluaran..."
                      value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} style={{ marginBottom: 0 }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Qty & Unit</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="number" className="input-field" style={{ flex: 1 }} placeholder="1"
                          value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)} />
                        <input type="text" className="input-field" style={{ flex: 1 }} placeholder="pcs"
                          value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} />
                      </div>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Nominal (Rp)</label>
                      <input type="number" className="input-field" placeholder="Harga"
                        value={item.priceInput} onChange={(e) => handleItemChange(item.id, 'priceInput', e.target.value)} />
                    </div>
                </div>

                <button className="btn btn-secondary btn-sm" style={{ marginTop: '1.5rem', padding: '0.5rem' }} onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                  <XCircle size={18} color={items.length === 1 ? 'var(--text-muted)' : 'var(--danger)'} />
                </button>
              </div>
            );
          })}
        </div>

          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: '1rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Potongan & Pajak (Level Transaksi)</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Diskon (%)</label>
                <input type="number" className="input-field" placeholder="0"
                  value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">PPN (%)</label>
                <input type="number" className="input-field" placeholder="11"
                  value={ppnPercentage} onChange={(e) => setPpnPercentage(e.target.value)} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">PPh (%)</label>
                <input type="number" className="input-field" placeholder="2.5"
                  value={pphPercentage} onChange={(e) => setPphPercentage(e.target.value)} />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Item:</span>
                <span style={{ fontWeight: 600 }}>Rp {formatCurrency(totalItemNominal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Diskon ({parsedDiscountPercent}%):</span>
                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- Rp {formatCurrency(discountNominal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>DPP (Dasar Pengenaan Pajak):</span>
                <span style={{ fontWeight: 600 }}>Rp {formatCurrency(dpp)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>PPN ({parsedPpn}%):</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>+ Rp {formatCurrency(ppnAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Jasa:</span>
                <span style={{ fontWeight: 600 }}>Rp {formatCurrency(totalJasaNominal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>PPh ({parsedPph}% dari Jasa):</span>
                <span style={{ fontWeight: 600, color: 'var(--warning)' }}>- Rp {formatCurrency(pphAmount)}</span>
              </div>
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '1.5rem' }}>
            <label className="input-label">Catatan Tambahan (Opsional)</label>
            <textarea className="input-field" rows={3} placeholder="Masukkan keterangan tambahan jika ada..."
              value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', padding: '1.25rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Grand Total Nominal</p>
              <h2 style={{ margin: 0, color: grandTotal < 0 ? 'var(--danger)' : 'var(--success)' }}>Rp {formatCurrency(grandTotal)}</h2>
            </div>
          </div>
      </div>
    </div>
  );
}
