import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Font
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

export function VoucherPDF({ voucher }: { voucher: any }) {
  const rolesNeeded = ['ADMIN', 'ACCOUNTING_1', 'ACCOUNTING_2', 'ACCOUNTING_3', 'FINANCE', 'DIREKTUR_UTAMA', 'DIREKTUR'];
  
  const signatures = rolesNeeded.map(role => {
    // Find the log where this role approved/created
    const log = voucher.auditLogs?.find((l: any) => l.user?.role === role && (l.action === 'APPROVE' || l.action === 'CREATE'));
    return {
      role: role.replace('_', ' '),
      name: log?.user?.name || '',
      date: log?.createdAt ? formatDate(log.createdAt) : ''
    };
  });

  const totalItems = voucher.nominal || 0;
  const totalJasa = voucher.items?.filter((i: any) => i.type === 'JASA').reduce((sum: number, i: any) => sum + i.nominal, 0) || 0;
  const discountNominal = (totalItems * (voucher.discountPercentage || 0)) / 100;
  const dpp = totalItems - discountNominal;
  const ppnNominal = (dpp * (voucher.ppnPercentage || 0)) / 100;
  const pphNominal = (totalJasa * (voucher.pphPercentage || 0)) / 100;
  const grandTotal = voucher.grandTotal || (dpp + ppnNominal - pphNominal);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>VOUCHER {voucher.type || 'PENGELUARAN'}</Text>
            <Text style={{ fontSize: 9, color: '#666', marginTop: 4 }}>FinanceFlow Automation System</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metaLabel}>NO. VOUCHER</Text>
            <Text style={[styles.metaValue, { fontSize: 14, color: '#dc2626' }]}>{voucher.voucherNumber}</Text>
            <Text style={[styles.metaLabel, { marginTop: 4 }]}>TANGGAL</Text>
            <Text style={styles.metaValue}>{formatDate(voucher.date)}</Text>
          </View>
        </View>

        {/* Meta Details */}
        <View style={styles.metaContainer}>
          <View style={[styles.metaGroup, { width: '40%' }]}>
            <Text style={styles.metaLabel}>VENDOR / KEPADA</Text>
            <Text style={styles.metaValue}>{voucher.vendor?.name || '-'}</Text>
          </View>
          <View style={[styles.metaGroup, { width: '20%' }]}>
            <Text style={styles.metaLabel}>BANK</Text>
            <Text style={styles.metaValue}>{voucher.bankName}</Text>
          </View>
          <View style={[styles.metaGroup, { width: '40%' }]}>
            <Text style={styles.metaLabel}>NO. REKENING</Text>
            <Text style={styles.metaValue}>{voucher.accountNumber} (a/n {voucher.accountName})</Text>
          </View>
        </View>

        {/* Optional Vendor Meta Details */}
        {(voucher.vendor?.address || voucher.vendor?.npwp || voucher.vendor?.nik) ? (
          <View style={[styles.metaContainer, { marginTop: -10 }]}>
            <View style={[styles.metaGroup, { width: '40%' }]}>
              {voucher.vendor?.address ? (
                <>
                  <Text style={styles.metaLabel}>ALAMAT</Text>
                  <Text style={styles.metaValue}>{voucher.vendor.address}</Text>
                </>
              ) : null}
            </View>
            <View style={[styles.metaGroup, { width: '20%' }]}>
              {voucher.vendor?.npwp ? (
                <>
                  <Text style={styles.metaLabel}>NPWP</Text>
                  <Text style={styles.metaValue}>{voucher.vendor.npwp}</Text>
                </>
              ) : null}
            </View>
            <View style={[styles.metaGroup, { width: '40%' }]}>
              {voucher.vendor?.nik ? (
                <>
                  <Text style={styles.metaLabel}>NIK</Text>
                  <Text style={styles.metaValue}>{voucher.vendor.nik}</Text>
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Items Table */}
        <Text style={styles.sectionTitle}>RINCIAN BIAYA</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.tableColHeader, { width: '10%' }]}><Text style={styles.tableCellHeader}>NO</Text></View>
            <View style={[styles.tableColHeader, { width: '60%' }]}><Text style={styles.tableCellHeader}>KETERANGAN</Text></View>
            <View style={[styles.tableColHeader, { width: '30%', textAlign: 'right' }]}><Text style={styles.tableCellHeader}>NOMINAL (Rp)</Text></View>
          </View>
          {voucher.items?.map((item: any, idx: number) => (
            <View style={styles.tableRow} key={item.id}>
              <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCell}>{idx + 1}</Text></View>
              <View style={[styles.tableCol, { width: '60%' }]}><Text style={styles.tableCell}>{item.description}</Text></View>
              <View style={[styles.tableCol, { width: '30%', textAlign: 'right' }]}><Text style={styles.tableCell}>{formatCurrency(item.nominal)}</Text></View>
            </View>
          ))}
          <View style={[styles.totalRow, { backgroundColor: '#ffffff' }]}>
            <View style={[styles.tableCol, { width: '70%', padding: 6, alignItems: 'flex-end', borderTopWidth: 0 }]}><Text style={styles.tableCell}>Total Item:</Text></View>
            <View style={[styles.tableCol, { width: '30%', padding: 6, textAlign: 'right', borderTopWidth: 0 }]}><Text style={styles.tableCell}>{formatCurrency(totalItems)}</Text></View>
          </View>
          <View style={[styles.totalRow, { backgroundColor: '#ffffff' }]}>
            <View style={[styles.tableCol, { width: '70%', padding: 6, alignItems: 'flex-end', borderTopWidth: 0 }]}><Text style={styles.tableCell}>Diskon ({voucher.discountPercentage || 0}%):</Text></View>
            <View style={[styles.tableCol, { width: '30%', padding: 6, textAlign: 'right', borderTopWidth: 0 }]}><Text style={[styles.tableCell, { color: '#dc2626' }]}>- {formatCurrency(discountNominal)}</Text></View>
          </View>
          <View style={[styles.totalRow, { backgroundColor: '#f9fafb' }]}>
            <View style={[styles.tableCol, { width: '70%', padding: 6, alignItems: 'flex-end', borderTopWidth: 0 }]}><Text style={styles.tableCellHeader}>DPP (Dasar Pengenaan Pajak):</Text></View>
            <View style={[styles.tableCol, { width: '30%', padding: 6, textAlign: 'right', borderTopWidth: 0 }]}><Text style={styles.tableCellHeader}>{formatCurrency(dpp)}</Text></View>
          </View>
          <View style={[styles.totalRow, { backgroundColor: '#ffffff' }]}>
            <View style={[styles.tableCol, { width: '70%', padding: 6, alignItems: 'flex-end', borderTopWidth: 0 }]}><Text style={styles.tableCell}>PPN ({voucher.ppnPercentage || 0}%):</Text></View>
            <View style={[styles.tableCol, { width: '30%', padding: 6, textAlign: 'right', borderTopWidth: 0 }]}><Text style={[styles.tableCell, { color: '#059669' }]}>+ {formatCurrency(ppnNominal)}</Text></View>
          </View>
          <View style={[styles.totalRow, { backgroundColor: '#ffffff' }]}>
            <View style={[styles.tableCol, { width: '70%', padding: 6, alignItems: 'flex-end', borderTopWidth: 0 }]}><Text style={styles.tableCell}>Total Jasa:</Text></View>
            <View style={[styles.tableCol, { width: '30%', padding: 6, textAlign: 'right', borderTopWidth: 0 }]}><Text style={styles.tableCell}>{formatCurrency(totalJasa)}</Text></View>
          </View>
          <View style={[styles.totalRow, { backgroundColor: '#ffffff' }]}>
            <View style={[styles.tableCol, { width: '70%', padding: 6, alignItems: 'flex-end', borderTopWidth: 0 }]}><Text style={styles.tableCell}>PPh ({voucher.pphPercentage || 0}% dari Jasa):</Text></View>
            <View style={[styles.tableCol, { width: '30%', padding: 6, textAlign: 'right', borderTopWidth: 0 }]}><Text style={[styles.tableCell, { color: '#dc2626' }]}>- {formatCurrency(pphNominal)}</Text></View>
          </View>
          <View style={[styles.totalRow, { backgroundColor: '#eff6ff' }]}>
            <View style={[styles.tableCol, { width: '70%', padding: 8, alignItems: 'flex-end', borderTopWidth: 0 }]}><Text style={styles.tableCellHeader}>GRAND TOTAL NOMINAL:</Text></View>
            <View style={[styles.tableCol, { width: '30%', padding: 8, textAlign: 'right', borderTopWidth: 0 }]}><Text style={[styles.tableCellHeader, { color: grandTotal < 0 ? '#dc2626' : '#059669', fontSize: 11 }]}>{formatCurrency(grandTotal)}</Text></View>
          </View>
        </View>

        {/* Remarks (If any) */}
        {voucher.remarks && (
          <View style={{ marginTop: 10, padding: 10, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#6b7280', marginBottom: 4 }}>CATATAN TAMBAHAN (REMARKS)</Text>
            <Text style={{ fontSize: 9, color: '#374151' }}>{voucher.remarks}</Text>
          </View>
        )}

        {/* Signatures */}
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

        {/* Footer */}
        <Text style={{ position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', color: '#aaa', fontSize: 8 }}>
          Dokumen ini digenerate secara otomatis oleh FinanceFlow System pada {new Date().toLocaleString('id-ID')}
        </Text>
      </Page>
    </Document>
  );
}
