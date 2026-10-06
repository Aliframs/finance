'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react';

export default function CreatePOPage() {
  const { currentRole, currentUser } = useAuth();
  const router = useRouter();

  const [vendors, setVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [poNumber, setPoNumber] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [picId, setPicId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<{ id: string; type: string; description: string; unit: string; qty: string; priceInput: string }[]>([
    { id: 'item-1', type: 'BARANG', description: '', unit: 'pcs', qty: '1', priceInput: '' }
  ]);
  
  // Tax / Calculation State
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [ppnPercentage, setPpnPercentage] = useState('0');
  const [pphPercentage, setPphPercentage] = useState('0');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/vendors').then(res => res.json()),
      fetch('/api/users').then(res => res.json())
    ]).then(([vendorsData, usersData]) => {
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setLoadingData(false);
    }).catch(err => {
      console.error(err);
      setLoadingData(false);
    });
  }, []);

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
    setItems([...items, { id: `item-${Date.now()}`, type: 'BARANG', description: '', unit: 'pcs', qty: '1', priceInput: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: 'type' | 'description' | 'unit' | 'qty' | 'priceInput', value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async () => {
    if (!poNumber || !vendorId || !picId || items.some(item => !item.description || !item.priceInput || !item.qty)) return;
    
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        poNumber,
        vendorId,
        picId,
        date,
        items: parsedItems,
        nominal: totalItemNominal,
        discountPercentage: parsedDiscountPercent,
        ppnPercentage: parsedPpn,
        pphPercentage: parsedPph,
        grandTotal: grandTotal,
      };

      const res = await fetch('/api/po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Terjadi kesalahan saat menyimpan PO');
      }

      alert(`PO berhasil dibuat!`);
      router.push('/po');
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentRole !== 'ADMIN') {
    return (
      <div className="glass-panel empty-state">
        <p>Hanya role <strong>Admin</strong> yang dapat membuat PO baru.</p>
        <Link href="/po" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Kembali</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/po" className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.15rem' }}>Buat Purchase Order</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Isi detail untuk membuat PO baru.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!poNumber || !vendorId || !picId || items.some(i => !i.description || !i.priceInput || !i.qty) || isSubmitting}>
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {isSubmitting ? 'Menyimpan...' : 'Simpan & Submit'}
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            Informasi PO
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="input-group">
              <label className="input-label">Nomor PO *</label>
              <input type="text" className="input-field" placeholder="Contoh: PO-25-001"
                value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Tanggal *</label>
              <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Kepada (Vendor) *</label>
            <select className="input-field" value={vendorId} onChange={(e) => setVendorId(e.target.value)} disabled={loadingData}>
              <option value="">{loadingData ? 'Memuat vendor...' : '— Pilih dari Master Data —'}</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">PIC (Pengaju) *</label>
            <select className="input-field" value={picId} onChange={(e) => setPicId(e.target.value)} disabled={loadingData}>
              <option value="">{loadingData ? 'Memuat user...' : '— Pilih PIC —'}</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Item / Barang</h3>
            <button className="btn btn-secondary btn-sm" onClick={addItem}>
              <Plus size={14} /> Tambah Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item, index) => {
              const qty = parseFloat(item.qty) || 0;
              const price = parseFloat(item.priceInput) || 0;
              const nominal = qty * price;
              return (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 0.5fr 0.5fr 1fr auto', gap: '1rem', alignItems: 'flex-start', background: 'rgba(255,255,255,0.4)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Jenis</label>
                    <select className="input-field" value={item.type} onChange={(e) => handleItemChange(item.id, 'type', e.target.value)} style={{ marginBottom: 0 }}>
                      <option value="BARANG">Barang</option>
                      <option value="JASA">Jasa</option>
                    </select>
                  </div>
                  
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Deskripsi *</label>
                    <textarea className="input-field" rows={2} placeholder="Deskripsi..."
                      value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} style={{ marginBottom: 0 }} />
                  </div>
                  
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Unit</label>
                    <input type="text" className="input-field" placeholder="pcs"
                      value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} style={{ marginBottom: 0 }} />
                  </div>
                  
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Qty *</label>
                    <input type="number" className="input-field" placeholder="1"
                      value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)} style={{ marginBottom: 0 }} />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Nominal (Rp) *</label>
                    <input type="number" className="input-field" placeholder="Cth: 50000"
                      value={item.priceInput} onChange={(e) => handleItemChange(item.id, 'priceInput', e.target.value)} style={{ marginBottom: '0.5rem' }} />
                    {item.priceInput && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                        Total: Rp {formatCurrency(nominal)}
                      </span>
                    )}
                  </div>

                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '1.5rem', padding: '0.5rem' }} onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                    <Trash2 size={18} color={items.length === 1 ? 'var(--text-muted)' : 'var(--danger)'} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Summary */}
        <div style={{ position: 'sticky', top: '2rem', height: 'fit-content' }}>
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem' }}>Ringkasan PO</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Diskon Global (%)</label>
                <input type="number" className="input-field" placeholder="0"
                  value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>Total Item:</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>Rp {formatCurrency(totalItemNominal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>Diskon ({parsedDiscountPercent}%):</span>
                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- Rp {formatCurrency(discountNominal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>DPP:</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>Rp {formatCurrency(dpp)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>PPN ({parsedPpn}%):</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>+ Rp {formatCurrency(ppnAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>Total Jasa:</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>Rp {formatCurrency(totalJasaNominal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>PPh ({parsedPph}% dari Jasa):</span>
                <span style={{ fontWeight: 600, color: 'var(--warning)' }}>- Rp {formatCurrency(pphAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                <span>Grand Total:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.2rem' }}>
                  Rp {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
