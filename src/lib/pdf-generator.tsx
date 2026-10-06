import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "./utils";

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    textDecoration: "underline",
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    fontSize: 10,
  },
  headerCol: {
    flexDirection: "column",
    gap: 4,
  },
  headerLabel: {
    width: 60,
    fontWeight: "bold",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#000",
    marginRight: 4,
  },
  checkboxChecked: {
    backgroundColor: "#000",
  },
  rowBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  valueText: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    minWidth: 150,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB", // gray-200
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    alignItems: "center",
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 150, // Fix height like reference image
  },
  tableCellCenter: {
    padding: 6,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: "#000",
    textAlign: "center",
  },
  tableCellLeft: {
    padding: 6,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  tableCellRight: {
    padding: 6,
    fontSize: 10,
    textAlign: "right",
  },
  col1: { width: "10%" },
  col2: { width: "65%" },
  col3: { width: "25%", borderRightWidth: 0 },
  footerRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  footerLeft: {
    width: "75%",
    padding: 6,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  footerRight: {
    width: "25%",
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "bold",
    fontSize: 12,
  },
  signatureTable: {
    width: "100%",
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  sigHeaderCell: {
    flex: 1,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    textAlign: "center",
    fontSize: 9,
    fontWeight: "bold",
  },
  sigBodyCell: {
    flex: 1,
    height: 60,
    borderRightWidth: 1,
    borderRightColor: "#000",
    padding: 4,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sigTextName: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
  sigTextDate: {
    fontSize: 8,
    textAlign: "center",
  },
});

interface VoucherTemplateProps {
  data: {
    voucherNumber: string;
    vendorName: string;
    date: Date;
    paymentType: string;
    bankName?: string;
    bankAccount?: string;
    bankAccountName?: string;
    nominal: number;
    lineItems: Array<{ lineNumber: number; description: string; amount: number }>;
    signatures: Array<{ role: string; name: string; date: string } | null>;
  };
}

// React-PDF Component
const VoucherPDF = ({ data }: VoucherTemplateProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>BUKTI PENGELUARAN</Text>

      {/* Header Info */}
      <View style={styles.headerRow}>
        <View style={styles.headerCol}>
          <View style={styles.checkboxRow}>
            <View style={styles.rowBox}>
              <View
                style={[
                  styles.checkbox,
                  data.paymentType === "BANK" ? styles.checkboxChecked : {},
                ]}
              />
              <Text>Bank</Text>
            </View>
            <View style={[styles.rowBox, { marginLeft: 10 }]}>
              <View
                style={[
                  styles.checkbox,
                  data.paymentType === "CASH_ADVANCE" ? styles.checkboxChecked : {},
                ]}
              />
              <Text>Cash Advance</Text>
            </View>
            <View style={[styles.rowBox, { marginLeft: 10 }]}>
              <View
                style={[
                  styles.checkbox,
                  data.paymentType === "KAS_KECIL" ? styles.checkboxChecked : {},
                ]}
              />
              <Text>KAS Kecil</Text>
            </View>
          </View>
          <View style={styles.rowBox}>
            <Text style={styles.headerLabel}>Kepada :</Text>
            <Text style={styles.valueText}>{data.vendorName}</Text>
          </View>
        </View>

        <View style={styles.headerCol}>
          <View style={styles.rowBox}>
            <Text style={styles.headerLabel}>NOMOR :</Text>
            <Text style={styles.valueText}>
              {data.voucherNumber.split("-").pop()}
            </Text>
          </View>
          <View style={styles.rowBox}>
            <Text style={styles.headerLabel}>Tanggal :</Text>
            <Text style={styles.valueText}>{formatDate(data.date)}</Text>
          </View>
        </View>
      </View>

      {/* Table Data */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.col1]}>No.</Text>
          <Text style={[styles.tableHeaderCell, styles.col2]}>KETERANGAN</Text>
          <Text style={[styles.tableHeaderCell, styles.col3]}>JUMLAH (Rp)</Text>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCellCenter, styles.col1]}>
            {data.lineItems.map((item, i) => (
              <Text key={i} style={{ marginBottom: 4 }}>
                {item.lineNumber}
              </Text>
            ))}
          </View>
          <View style={[styles.tableCellLeft, styles.col2]}>
            {data.lineItems.map((item, i) => (
              <Text key={i} style={{ marginBottom: 4 }}>
                {item.description}
              </Text>
            ))}
          </View>
          <View style={[styles.tableCellRight, styles.col3]}>
            {data.lineItems.map((item, i) => (
              <Text key={i} style={{ marginBottom: 4 }}>
                {item.amount < 0
                  ? `(${formatCurrency(Math.abs(item.amount))})`
                  : formatCurrency(item.amount)}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* Footer Notes & Total */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          {data.paymentType === "BANK" && (
            <>
              <Text style={{ fontWeight: "bold", marginBottom: 2 }}>
                Catatan : Transfer ke
              </Text>
              <Text style={{ marginLeft: 60, marginBottom: 2 }}>
                Bank : {data.bankName}
              </Text>
              <Text style={{ marginLeft: 60, marginBottom: 2 }}>
                A/c : {data.bankAccount}
              </Text>
              <Text style={{ marginLeft: 60 }}>
                Nama : {data.bankAccountName}
              </Text>
            </>
          )}
        </View>
        <View style={styles.footerRight}>
          <Text>Rp</Text>
          <Text>{formatCurrency(data.nominal)}</Text>
        </View>
      </View>

      {/* Signatures */}
      <View style={{ width: "100%" }}>
        <View style={{ flexDirection: "row", width: "100%" }}>
          {["Diajukan", "Diperiksa", "Diperiksa", "Diketahui", "Diketahui", "Diketahui"].map(
            (label, idx) => (
              <Text
                key={idx}
                style={[
                  styles.sigHeaderCell,
                  idx === 5 ? { borderRightWidth: 0 } : {},
                ]}
              >
                {label}
              </Text>
            )
          )}
        </View>
        <View style={{ flexDirection: "row", width: "100%", borderBottomWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 }}>
          {data.signatures.map((sig, idx) => (
            <View
              key={idx}
              style={[
                styles.sigBodyCell,
                idx === 5 ? { borderRightWidth: 0 } : {},
              ]}
            >
              {sig && (
                <>
                  <Text style={styles.sigTextName}>{sig.name}</Text>
                  <Text style={styles.sigTextDate}>{sig.date}</Text>
                </>
              )}
            </View>
          ))}
        </View>
      </View>
    </Page>
  </Document>
);

/**
 * Generates a PDF buffer for a voucher using React-PDF.
 */
export async function generateVoucherPdfBuffer(data: VoucherTemplateProps["data"]): Promise<Buffer> {
  // renderToBuffer from @react-pdf/renderer generates a Node Buffer
  const buffer = await renderToBuffer(<VoucherPDF data={data} />);
  return Buffer.from(buffer);
}
