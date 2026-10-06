import React from 'react';
import {
  Document, Page, Text, View, StyleSheet
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a8a',
    paddingBottom: 10,
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a'
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  metaGroup: {
    flexDirection: 'column',
    gap: 4
  },
  metaLabel: {
    color: '#666',
    fontSize: 8,
    textTransform: 'uppercase'
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 'bold'
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20
  },
  tableRow: {
    flexDirection: 'row'
  },
  tableColHeader: {
    backgroundColor: '#f3f4f6',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#4b5563'
  },
  tableCell: {
    fontSize: 9
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e3a8a',
    marginTop: 10
  },
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    width: '100%'
  },
  signatureBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2
  },
  signatureRole: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center'
  },
  signatureName: {
    fontSize: 7,
    textDecoration: 'underline',
    textAlign: 'center'
  },
  signatureDate: {
    fontSize: 6,
    color: '#666',
    marginTop: 2,
    textAlign: 'center'
  }
});

function formatCurrency(amount: number) {
  return amount.toLocaleString('id-ID');
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function POPDF({ po }: { po: any }) {
  const adminLog = po.auditLogs?.find((l: any) => l.action === 'CREATE' || (l.user?.role === 'ADMIN' && l.action === 'APPROVE'));
  const picLog = po.auditLogs?.find((l: any) => l.user?.id === po.picId && l.action === 'APPROVE');
  const dirutLog = po.auditLogs?.find((l: any) => l.user?.role === 'DIREKTUR_UTAMA' && l.action === 'APPROVE');

  const signatures = [
    {
      role: 'DIBUAT OLEH (ADMIN)',
      name: adminLog?.user?.name || 'Admin',
      date: adminLog?.createdAt ? formatDate(adminLog.createdAt) : formatDate(po.createdAt)
    },
    {
      role: 'MENGAJUKAN (PIC)',
      name: po.pic?.name || 'PIC',
      date: picLog?.createdAt ? formatDate(picLog.createdAt) : ''
    },
    {
      role: 'MENGETAHUI (DIREKTUR UTAMA)',
      name: dirutLog?.user?.name || '',
      date: dirutLog?.createdAt ? formatDate(dirutLog.createdAt) : ''
    }
  ];

  const totalNominal = po.items?.reduce((sum: number, item: any) => sum + item.nominal, 0) || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>PURCHASE ORDER</Text>
            <Text style={{ fontSize: 9, color: '#666', marginTop: 4 }}>FinanceFlow Automation System</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metaLabel}>NO. PO</Text>
            <Text style={[styles.metaValue, { fontSize: 14, color: '#1e3a8a' }]}>{po.poNumber}</Text>
            <Text style={[styles.metaLabel, { marginTop: 4 }]}>TANGGAL</Text>
            <Text style={styles.metaValue}>{formatDate(po.date)}</Text>
          </View>
        </View>

        <View style={styles.metaContainer}>
          <View style={[styles.metaGroup, { width: '50%' }]}>
            <Text style={styles.metaLabel}>KEPADA (VENDOR)</Text>
            <Text style={styles.metaValue}>{po.vendor?.name || '-'}</Text>
            {po.vendor?.address && (
              <Text style={{ fontSize: 9, marginTop: 4, color: '#4b5563' }}>{po.vendor.address}</Text>
            )}
            {po.vendor?.bankName && po.vendor?.accountNumber && (
              <Text style={{ fontSize: 9, marginTop: 2, color: '#4b5563' }}>
                Bank {po.vendor.bankName} - {po.vendor.accountNumber}
              </Text>
            )}
            {po.vendor?.accountName && (
              <Text style={{ fontSize: 9, marginTop: 1, color: '#4b5563' }}>
                a.n {po.vendor.accountName}
              </Text>
            )}
          </View>
          <View style={[styles.metaGroup, { width: '50%', alignItems: 'flex-end' }]}>
            <Text style={styles.metaLabel}>DARI (PIC)</Text>
            <Text style={styles.metaValue}>{po.pic?.name || '-'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>RINCIAN BARANG / JASA</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.tableColHeader, { width: '10%' }]}><Text style={styles.tableCellHeader}>NO</Text></View>
            <View style={[styles.tableColHeader, { width: '50%' }]}><Text style={styles.tableCellHeader}>KETERANGAN</Text></View>
            <View style={[styles.tableColHeader, { width: '15%', textAlign: 'center' }]}><Text style={styles.tableCellHeader}>QTY</Text></View>
            <View style={[styles.tableColHeader, { width: '25%', textAlign: 'right' }]}><Text style={styles.tableCellHeader}>NOMINAL (Rp)</Text></View>
          </View>
          {po.items?.map((item: any, idx: number) => (
            <View style={styles.tableRow} key={item.id}>
              <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCell}>{idx + 1}</Text></View>
              <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCell}>{item.description}</Text></View>
              <View style={[styles.tableCol, { width: '15%', textAlign: 'center' }]}><Text style={styles.tableCell}>{item.qty}</Text></View>
              <View style={[styles.tableCol, { width: '25%', textAlign: 'right' }]}><Text style={styles.tableCell}>{formatCurrency(item.nominal)}</Text></View>
            </View>
          ))}
          <View style={styles.totalRow}>
            <View style={[styles.tableCol, { width: '75%', padding: 8, alignItems: 'flex-end' }]}>
              <Text style={styles.tableCellHeader}>TOTAL:</Text>
            </View>
            <View style={[styles.tableCol, { width: '25%', padding: 8, textAlign: 'right' }]}>
              <Text style={[styles.tableCellHeader, { color: '#059669' }]}>
                {formatCurrency(totalNominal)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.signatureContainer}>
          {signatures.map((sig, idx) => (
            <View style={styles.signatureBox} key={idx}>
              <Text style={styles.signatureRole}>{sig.role}</Text>
              {sig.name ? (
                <>
                  <Text style={styles.signatureName}>{sig.name}</Text>
                  <Text style={styles.signatureDate}>{sig.date}</Text>
                </>
              ) : (
                <Text style={[styles.signatureName, { color: '#aaa', textDecoration: 'none' }]}>(Belum disetujui)</Text>
              )}
            </View>
          ))}
        </View>

        <Text style={{ position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', color: '#aaa', fontSize: 8 }}>
          Dokumen ini digenerate secara otomatis oleh FinanceFlow System pada {new Date().toLocaleString('id-ID')}
        </Text>
      </Page>
    </Document>
  );
}
