import Link from "next/link";
import { 
  FileText, 
  Calculator, 
  Landmark, 
  ArrowRightLeft, 
  PieChart, 
  PenTool,
  ChevronRight
} from "lucide-react";

export default function ReportsDashboard() {
  const reports = [
    {
      title: "Neraca Saldo",
      subtitle: "Trial Balance",
      description: "Daftar saldo dari seluruh buku besar per akun.",
      href: "/reports/trial-balance",
      icon: Calculator
    },
    {
      title: "Laba Rugi",
      subtitle: "Profit & Loss",
      description: "Laporan pendapatan dan beban untuk mengetahui keuntungan/kerugian.",
      href: "/reports/profit-loss",
      icon: PieChart
    },
    {
      title: "Neraca",
      subtitle: "Balance Sheet",
      description: "Posisi aset, kewajiban, dan ekuitas perusahaan pada waktu tertentu.",
      href: "/reports/balance-sheet",
      icon: Landmark
    },
    {
      title: "Arus Kas",
      subtitle: "Cash Flow",
      description: "Laporan penerimaan dan pengeluaran kas.",
      href: "/reports/cash-flow",
      icon: ArrowRightLeft
    },
    {
      title: "Perubahan Ekuitas",
      subtitle: "Equity Statement",
      description: "Laporan pergerakan modal dan laba ditahan.",
      href: "/reports/equity",
      icon: FileText
    },
    {
      title: "Koreksi Fiskal",
      subtitle: "Tax Automation",
      description: "Penyesuaian untuk pelaporan pajak (Tax Automation).",
      href: "/reports/fiscal-adjustment",
      icon: PenTool
    }
  ];

  return (
    <div>
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Laporan Keuangan</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, maxWidth: '600px' }}>
          Pilih jenis laporan untuk melihat atau mengunduh data keuangan. Sistem secara otomatis merekap semua transaksi yang telah disetujui secara real-time.
        </p>
      </div>

      {/* Grid of Report Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {reports.map((report) => (
          <Link href={report.href} key={report.title} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div 
              className="glass-panel stat-card" 
              style={{ 
                height: '100%', 
                padding: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  background: 'var(--primary-light)', 
                  color: 'var(--primary)', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <report.icon size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>{report.title}</h3>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.2rem' }}>
                    {report.subtitle}
                  </div>
                </div>
              </div>
              
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', flex: 1, lineHeight: '1.5' }}>
                {report.description}
              </p>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-end',
                marginTop: '0.5rem',
                color: 'var(--primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                gap: '0.25rem'
              }}>
                Buka Laporan <ChevronRight size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
