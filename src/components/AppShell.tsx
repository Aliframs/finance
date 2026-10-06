'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth, ROLE_LABELS } from '@/lib/auth-context';
import { ALL_ROLES, type UserRole } from '@/lib/workflow-engine';
import { useState, useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { logoutAction } from '@/app/actions/auth';
import {
  LayoutDashboard, FileText, Database, BookOpen, Settings, Sun, Moon, LogOut, ShoppingCart, Bell, Check, PieChart
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Vouchers', href: '/vouchers', icon: FileText },
  { label: 'Purchase Order', href: '/po', icon: ShoppingCart },
  { label: 'Master Data', href: '/master-data', icon: Database },
  { label: 'Journal', href: '/journal', icon: BookOpen },
  { label: 'Laporan', href: '/reports', icon: PieChart },
];

function SidebarNav({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  useEffect(() => { setIsOpen(false); }, [pathname]);
  const { currentRole, currentUser, setCurrentRole } = useAuth();

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(false)}></div>
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">FV</span>
        FinanceFlow
      </div>

      <ul className="nav-menu">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
              <item.icon />
              {item.label}
            </Link>
          );
        })}
      </ul>

      <div className="user-card">
        <div className="user-avatar">{currentUser.name.charAt(0)}</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser.name}
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {ROLE_LABELS[currentRole]}
          </p>
        </div>
      </div>
    </aside>
    </>
  );
}

function TopBar() {
  const router = useRouter();
  const { currentRole, currentUser, setCurrentRole } = useAuth();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = () => {
    if (!currentUser) return;
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(err => console.error("Failed to fetch notifications:", err));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const markAllAsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'MARK_ALL_READ' })
    });
    fetchNotifications();
  };
  
  const markAsRead = async (id: string, link: string | null) => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'MARK_READ', id })
    });
    fetchNotifications();
    if (link) {
      router.push(link);
    }
  };

  return (
    <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
      
      {/* Notifications Dropdown */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowNotifications(!showNotifications)} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', position: 'relative' }} title="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div style={{ position: 'absolute', top: '120%', right: 0, width: '320px', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', borderRadius: '12px', zIndex: 100, overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Notifikasi</h4>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Check size={14} /> Tandai Semua Dibaca
                </button>
              )}
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Belum ada notifikasi
                </div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} 
                    onClick={() => markAsRead(notif.id, notif.link)}
                    style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: notif.isRead ? 'transparent' : 'var(--primary-light)', cursor: notif.link ? 'pointer' : 'default', transition: 'background 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '0.85rem', color: notif.isRead ? 'var(--text)' : 'var(--primary)' }}>{notif.title}</strong>
                      {!notif.isRead && <span style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{notif.message}</p>
                    <small style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {new Date(notif.createdAt).toLocaleString('id-ID')}
                    </small>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>


      <button onClick={toggleTheme} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)' }} title="Toggle Theme">
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <div className="role-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>{currentUser?.name || 'Loading...'}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{currentRole ? ROLE_LABELS[currentRole] : ''}</span>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-danger btn-sm" style={{ padding: '0.5rem', borderRadius: '8px' }} title="Logout">
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <SessionProvider>
      <AuthProvider>
        {isLoginPage ? (
          children
        ) : (
          <div className="app-container">
            <SidebarNav isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <main className="main-content">
              <div className="mobile-header">
                <div className="mobile-header-title">FV FinanceFlow</div>
                <button onClick={() => setIsSidebarOpen(true)} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '8px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
              </div>
              <TopBar />
              <div className="animate-slide-up">
                {children}
              </div>
            </main>
          </div>
        )}
      </AuthProvider>
    </SessionProvider>
  );
}
