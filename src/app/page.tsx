'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowRight, Wallet } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError('Email atau password salah');
      } else {
        router.push('/vouchers');
        router.refresh();
      }
    } catch (err) {
      setError('Terjadi kesalahan pada server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dynamic Background Elements */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: '50%',
        height: '50%',
        background: 'rgba(59, 130, 246, 0.2)',
        borderRadius: '50%',
        filter: 'blur(120px)',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        animation: 'slideUpFade 5s infinite alternate'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        right: '-10%',
        width: '50%',
        height: '50%',
        background: 'rgba(16, 185, 129, 0.2)',
        borderRadius: '50%',
        filter: 'blur(120px)',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        animation: 'slideUpFade 5s infinite alternate-reverse'
      }} />

      {/* Login Card (Glassmorphism) */}
      <div className="glass-panel" style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '400px',
        padding: '3rem 2.5rem',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--primary), #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
            marginBottom: '1rem'
          }}>
            <Wallet size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Finance Portal</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Masuk ke akun Anda untuk melanjutkan</p>
        </div>

        {error && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-light)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            animation: 'fadeIn 0.3s ease'
          }}>
            <AlertCircle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.85rem', color: '#b91c1c', margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ marginLeft: '4px' }}>Alamat Email</label>
            <input
              type="email"
              required
              className="input-field"
              style={{ padding: '0.85rem 1rem' }}
              placeholder="admin@finance.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              disabled={loading}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ marginLeft: '4px' }}>Password</label>
            <input
              type="password"
              required
              className="input-field"
              style={{ padding: '0.85rem 1rem' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Masuk Sekarang
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <p style={{ margin: '0.2rem 0' }}>Hanya untuk penggunaan internal.</p>
          <p style={{ margin: '0.2rem 0' }}>Jika Anda lupa password, hubungi IT Support.</p>
        </div>
      </div>
    </div>
  );
}
