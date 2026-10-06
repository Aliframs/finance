'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Plus, Trash2, Save, X, Database as DatabaseIcon, BookOpen, Loader2, Download, Search, Edit2 } from 'lucide-react';

interface Vendor {
  id: string; name: string; bankName: string; accountNumber: string; accountName: string;
  address?: string; npwp?: string; nik?: string;
}

interface COA {
  id: string; accountNumber: string; accountName: string; fiscalYear: string;
}

export default function MasterDataPage() {
  const { currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'vendor' | 'coa'>('vendor');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [coas, setCoas] = useState<COA[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [coaFiscalYear, setCoaFiscalYear] = useState('2025');

  // Reset search when tab changes
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  const filteredVendors = vendors.filter(v => 
    [v.name, v.bankName, v.accountName, v.accountNumber, v.address, v.npwp, v.nik]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const filteredCoas = coas.filter(c => 
    c.fiscalYear === coaFiscalYear &&
    [c.accountName, c.accountNumber]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Vendor form
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', bankName: '', accountNumber: '', accountName: '', address: '', npwp: '', nik: '' });
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  // COA form
  const [showCoaForm, setShowCoaForm] = useState(false);
  const [coaForm, setCoaForm] = useState({ accountNumber: '', accountName: '', fiscalYear: '2025' });
  const [isSubmittingCoa, setIsSubmittingCoa] = useState(false);
  const [editingCoaId, setEditingCoaId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vendorRes, coaRes] = await Promise.all([
        fetch('/api/vendors'),
        fetch('/api/coas')
      ]);
      if (vendorRes.ok) setVendors(await vendorRes.json());
      if (coaRes.ok) setCoas(await coaRes.json());
    } catch (error) {
      console.error('Failed to fetch master data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addVendor = async () => {
    if (vendorForm.name && vendorForm.bankName) {
      setIsSubmittingVendor(true);
      try {
        const url = editingVendorId ? `/api/vendors?id=${editingVendorId}` : '/api/vendors';
        const method = editingVendorId ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vendorForm)
        });
        if (res.ok) {
          await fetchData();
          setVendorForm({ name: '', bankName: '', accountNumber: '', accountName: '', address: '', npwp: '', nik: '' });
          setShowVendorForm(false);
          setEditingVendorId(null);
        } else {
          alert(`Gagal ${editingVendorId ? 'mengedit' : 'menambahkan'} vendor`);
        }
      } catch (err) {
        alert('Terjadi kesalahan');
      } finally {
        setIsSubmittingVendor(false);
      }
    }
  };

  const addCoa = async () => {
    if (coaForm.accountNumber && coaForm.accountName) {
      setIsSubmittingCoa(true);
      try {
        const url = editingCoaId ? `/api/coas?id=${editingCoaId}` : '/api/coas';
        const method = editingCoaId ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...coaForm, fiscalYear: coaFiscalYear })
        });
        if (res.ok) {
          await fetchData();
          setCoaForm({ accountNumber: '', accountName: '', fiscalYear: '2025' });
          setShowCoaForm(false);
          setEditingCoaId(null);
        } else {
          alert(`Gagal ${editingCoaId ? 'mengedit' : 'menambahkan'} COA`);
        }
      } catch (err) {
        alert('Terjadi kesalahan');
      } finally {
        setIsSubmittingCoa(false);
      }
    }
  };

  const deleteVendor = async (id: string) => {
    if (!confirm('Hapus vendor ini?')) return;
    try {
      const res = await fetch(`/api/vendors?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Gagal menghapus vendor');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi');
    }
  };

  const deleteCoa = async (id: string) => {
    if (!confirm('Hapus COA ini?')) return;
    try {
      const res = await fetch(`/api/coas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Gagal menghapus COA');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi');
    }
  };

  if (currentRole !== 'ADMIN') {
    return (
      <div className="glass-panel empty-state">
        <p>Hanya <strong>Admin</strong> yang dapat mengelola Master Data.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Unified Header & Tab Switcher */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Master Data</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Kelola pusat data referensi sistem.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.2)', padding: '0.25rem', borderRadius: 'var(--radius-full)' }}>
            <button className={`btn ${activeTab === 'vendor' ? 'btn-primary' : ''}`}
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', background: activeTab === 'vendor' ? 'var(--primary)' : 'transparent', color: activeTab === 'vendor' ? 'white' : 'var(--text-muted)', border: 'none', boxShadow: 'none' }}
              onClick={() => setActiveTab('vendor')}>
              <DatabaseIcon size={14} /> Vendor
            </button>
            <button className={`btn ${activeTab === 'coa' ? 'btn-primary' : ''}`}
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', background: activeTab === 'coa' ? 'var(--primary)' : 'transparent', color: activeTab === 'coa' ? 'white' : 'var(--text-muted)', border: 'none', boxShadow: 'none' }}
              onClick={() => setActiveTab('coa')}>
              <BookOpen size={14} /> COA
            </button>
          </div>
          <a 
            href="/api/db-download" 
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.65rem 1rem' }}
            title="Download Database (SQLite)"
          >
            <Download size={14} />
          </a>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <Loader2 size={40} className="animate-spin" style={{ opacity: 0.5 }} />
          <p>Sinkronisasi master data...</p>
        </div>
      ) : (
        <>
          {/* Vendor Tab */}
          {activeTab === 'vendor' && (
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Master Vendor / Kepada</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowVendorForm(true)}>
                  <Plus size={14} /> Tambah Vendor
                </button>
              </div>

              {showVendorForm && (
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(59,130,246,0.03)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input className="input-field" placeholder="Nama Vendor / Perorangan" value={vendorForm.name} onChange={(e) => setVendorForm(p => ({ ...p, name: e.target.value }))} />
                    <input className="input-field" placeholder="Alamat" value={vendorForm.address} onChange={(e) => setVendorForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input className="input-field" placeholder="NPWP" value={vendorForm.npwp} onChange={(e) => setVendorForm(p => ({ ...p, npwp: e.target.value }))} />
                    <input className="input-field" placeholder="NIK" value={vendorForm.nik} onChange={(e) => setVendorForm(p => ({ ...p, nik: e.target.value }))} />
                    <input className="input-field" placeholder="Bank" value={vendorForm.bankName} onChange={(e) => setVendorForm(p => ({ ...p, bankName: e.target.value }))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input className="input-field" placeholder="No. Rekening" value={vendorForm.accountNumber} onChange={(e) => setVendorForm(p => ({ ...p, accountNumber: e.target.value }))} />
                    <input className="input-field" placeholder="Nama Rekening" value={vendorForm.accountName} onChange={(e) => setVendorForm(p => ({ ...p, accountName: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={addVendor} disabled={isSubmittingVendor}>
                      {isSubmittingVendor ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowVendorForm(false); setEditingVendorId(null); setVendorForm({ name: '', bankName: '', accountNumber: '', accountName: '', address: '', npwp: '', nik: '' }); }} disabled={isSubmittingVendor}><X size={14} /> Batal</button>
                  </div>
                </div>
              )}

              <div style={{ padding: '0 1.5rem 1rem', display: 'flex', gap: '1rem' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Cari nama vendor, bank, rekening..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Alamat / NPWP / NIK</th>
                    <th>Bank & Rekening</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 500 }}>{v.name}</td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {v.address ? <div>{v.address}</div> : null}
                          <div>{v.npwp ? `NPWP: ${v.npwp}` : ''} {v.nik ? `NIK: ${v.nik}` : ''}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{v.bankName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.accountNumber} a/n {v.accountName}</div>
                      </td>
                      <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm" style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none' }}
                          onClick={() => {
                            setVendorForm({ name: v.name, bankName: v.bankName, accountNumber: v.accountNumber, accountName: v.accountName, address: v.address || '', npwp: v.npwp || '', nik: v.nik || '' });
                            setEditingVendorId(v.id);
                            setShowVendorForm(true);
                          }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-sm" style={{ color: 'var(--danger)', background: 'transparent', border: 'none' }}
                          onClick={() => deleteVendor(v.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* COA Tab */}
          {activeTab === 'coa' && (
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Master COA (Chart of Accounts)</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCoaForm(true)}>
                  <Plus size={14} /> Tambah COA
                </button>
              </div>

              {showCoaForm && (
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(59,130,246,0.03)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input className="input-field" placeholder="Nomor Akun (e.g. 5-1100)" value={coaForm.accountNumber} onChange={(e) => setCoaForm(p => ({ ...p, accountNumber: e.target.value }))} />
                    <input className="input-field" placeholder="Nama Akun" value={coaForm.accountName} onChange={(e) => setCoaForm(p => ({ ...p, accountName: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={addCoa} disabled={isSubmittingCoa}>
                      {isSubmittingCoa ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowCoaForm(false); setEditingCoaId(null); setCoaForm({ accountNumber: '', accountName: '', fiscalYear: '2025' }); }} disabled={isSubmittingCoa}><X size={14} /> Batal</button>
                  </div>
                </div>
              )}

              <div style={{ padding: '0 1.5rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.1)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                  <button className={`btn btn-sm ${coaFiscalYear === '2025' ? 'btn-primary' : ''}`}
                    style={{ background: coaFiscalYear === '2025' ? 'var(--primary)' : 'transparent', color: coaFiscalYear === '2025' ? 'white' : 'var(--text-muted)', border: 'none', boxShadow: 'none' }}
                    onClick={() => setCoaFiscalYear('2025')}>
                    Tahun 2025
                  </button>
                  <button className={`btn btn-sm ${coaFiscalYear === '2026' ? 'btn-primary' : ''}`}
                    style={{ background: coaFiscalYear === '2026' ? 'var(--primary)' : 'transparent', color: coaFiscalYear === '2026' ? 'white' : 'var(--text-muted)', border: 'none', boxShadow: 'none' }}
                    onClick={() => setCoaFiscalYear('2026')}>
                    Tahun 2026
                  </button>
                </div>

                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Cari nomor akun atau nama akun..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nomor Akun</th>
                    <th>Nama Akun</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoas.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.accountNumber}</td>
                      <td>{c.accountName}</td>
                      <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm" style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none' }}
                          onClick={() => {
                            setCoaForm({ accountNumber: c.accountNumber, accountName: c.accountName, fiscalYear: c.fiscalYear });
                            setEditingCoaId(c.id);
                            setShowCoaForm(true);
                          }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-sm" style={{ color: 'var(--danger)', background: 'transparent', border: 'none' }}
                          onClick={() => deleteCoa(c.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
