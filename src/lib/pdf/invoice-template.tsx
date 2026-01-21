import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts for Polish characters support
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: "bold",
    },
  ],
});

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1a1a1a",
  },
  invoiceNumber: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333333",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 100,
    color: "#666666",
  },
  value: {
    flex: 1,
    color: "#1a1a1a",
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#1a1a1a",
  },
  companyDetails: {
    color: "#444444",
    marginBottom: 2,
  },
  partiesContainer: {
    flexDirection: "row",
    gap: 40,
    marginBottom: 30,
  },
  partyBox: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
  },
  partyTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#666666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    padding: 15,
    backgroundColor: "#f0f4f8",
    borderRadius: 4,
  },
  dateBox: {
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 8,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    padding: 10,
    borderRadius: 4,
  },
  tableHeaderCell: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 9,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    padding: 10,
  },
  tableRowAlt: {
    backgroundColor: "#f8f9fa",
  },
  tableCell: {
    fontSize: 9,
    color: "#333333",
  },
  colLp: { width: "5%" },
  colDesc: { width: "35%" },
  colQty: { width: "8%", textAlign: "center" },
  colUnit: { width: "8%", textAlign: "center" },
  colPrice: { width: "12%", textAlign: "right" },
  colVat: { width: "8%", textAlign: "center" },
  colNet: { width: "12%", textAlign: "right" },
  colGross: { width: "12%", textAlign: "right" },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
  },
  summaryBox: {
    width: 250,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  summaryRowTotal: {
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    marginTop: 4,
  },
  summaryLabel: {
    color: "#666666",
    fontSize: 10,
  },
  summaryValue: {
    fontWeight: "bold",
    fontSize: 10,
    color: "#1a1a1a",
  },
  summaryLabelTotal: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  summaryValueTotal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  paymentSection: {
    flexDirection: "row",
    gap: 40,
    marginBottom: 30,
  },
  paymentBox: {
    flex: 1,
  },
  bankAccount: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
    backgroundColor: "#f0f4f8",
    padding: 10,
    borderRadius: 4,
    marginTop: 5,
  },
  notes: {
    padding: 15,
    backgroundColor: "#fffbeb",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  notesText: {
    fontSize: 9,
    color: "#666666",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  footerText: {
    fontSize: 8,
    color: "#999999",
  },
  signatureBox: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: "#999999",
    paddingTop: 5,
    marginTop: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#666666",
    textAlign: "center",
  },
  statusBadge: {
    padding: "4 12",
    borderRadius: 4,
    marginTop: 5,
  },
  statusPaid: {
    backgroundColor: "#dcfce7",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  statusTextPaid: {
    color: "#166534",
  },
});

// Types
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceNet: number;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

interface Contractor {
  name: string;
  nip: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  email: string | null;
  phone: string | null;
}

interface Tenant {
  name: string;
  nip: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
}

interface InvoiceData {
  invoiceNumber: string;
  type: string;
  status: string;
  issueDate: Date;
  saleDate: Date | null;
  dueDate: Date;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  paymentMethod: string;
  bankAccount: string | null;
  isPaid: boolean;
  paidDate: Date | null;
  notes: string | null;
  items: InvoiceItem[];
  contractor: Contractor | null;
  tenant: Tenant;
}

// Helper functions
function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatCurrency(amount: number, currency: string = "PLN"): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

const paymentMethodLabels: Record<string, string> = {
  TRANSFER: "Przelew bankowy",
  CASH: "Gotowka",
  CARD: "Karta platnicza",
};

const invoiceTypeLabels: Record<string, string> = {
  SINGLE: "Faktura VAT",
  COLLECTIVE: "Faktura zbiorcza",
  PROFORMA: "Faktura pro forma",
  CORRECTION: "Faktura korygujaca",
};

// Invoice PDF Component
export function InvoicePDF({ invoice }: { invoice: InvoiceData }) {
  const { tenant, contractor, items } = invoice;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>
              {invoiceTypeLabels[invoice.type] || "Faktura VAT"}
            </Text>
            <Text style={styles.invoiceNumber}>Nr {invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.headerRight}>
            {invoice.isPaid && (
              <View style={[styles.statusBadge, styles.statusPaid]}>
                <Text style={[styles.statusText, styles.statusTextPaid]}>
                  OPLACONA
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesContainer}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Data wystawienia</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.issueDate)}</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Data sprzedazy</Text>
            <Text style={styles.dateValue}>
              {formatDate(invoice.saleDate || invoice.issueDate)}
            </Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Termin platnosci</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.dueDate)}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.partiesContainer}>
          {/* Seller */}
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>Sprzedawca</Text>
            <Text style={styles.companyName}>{tenant.name}</Text>
            {tenant.address && (
              <Text style={styles.companyDetails}>{tenant.address}</Text>
            )}
            {(tenant.postalCode || tenant.city) && (
              <Text style={styles.companyDetails}>
                {tenant.postalCode} {tenant.city}
              </Text>
            )}
            {tenant.nip && (
              <Text style={styles.companyDetails}>NIP: {tenant.nip}</Text>
            )}
            {tenant.phone && (
              <Text style={styles.companyDetails}>Tel: {tenant.phone}</Text>
            )}
            {tenant.email && (
              <Text style={styles.companyDetails}>{tenant.email}</Text>
            )}
          </View>

          {/* Buyer */}
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>Nabywca</Text>
            {contractor ? (
              <>
                <Text style={styles.companyName}>{contractor.name}</Text>
                {contractor.address && (
                  <Text style={styles.companyDetails}>{contractor.address}</Text>
                )}
                {(contractor.postalCode || contractor.city) && (
                  <Text style={styles.companyDetails}>
                    {contractor.postalCode} {contractor.city}
                  </Text>
                )}
                {contractor.nip && (
                  <Text style={styles.companyDetails}>NIP: {contractor.nip}</Text>
                )}
              </>
            ) : (
              <Text style={styles.companyDetails}>Brak danych nabywcy</Text>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colLp]}>Lp.</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>
              Nazwa uslugi / towaru
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Ilosc</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>Jedn.</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>
              Cena netto
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colVat]}>VAT %</Text>
            <Text style={[styles.tableHeaderCell, styles.colNet]}>
              Wartosc netto
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colGross]}>
              Wartosc brutto
            </Text>
          </View>

          {/* Table Rows */}
          {items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <Text style={[styles.tableCell, styles.colLp]}>{index + 1}</Text>
              <Text style={[styles.tableCell, styles.colDesc]}>
                {item.description}
              </Text>
              <Text style={[styles.tableCell, styles.colQty]}>
                {formatNumber(item.quantity)}
              </Text>
              <Text style={[styles.tableCell, styles.colUnit]}>{item.unit}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>
                {formatNumber(item.unitPriceNet)}
              </Text>
              <Text style={[styles.tableCell, styles.colVat]}>
                {item.vatRate}%
              </Text>
              <Text style={[styles.tableCell, styles.colNet]}>
                {formatNumber(item.netAmount)}
              </Text>
              <Text style={[styles.tableCell, styles.colGross]}>
                {formatNumber(item.grossAmount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Wartosc netto:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(invoice.netAmount, invoice.currency)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Podatek VAT:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(invoice.vatAmount, invoice.currency)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
              <Text style={styles.summaryLabelTotal}>DO ZAPLATY:</Text>
              <Text style={styles.summaryValueTotal}>
                {formatCurrency(invoice.grossAmount, invoice.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentBox}>
            <Text style={styles.sectionTitle}>Forma platnosci</Text>
            <Text style={styles.companyDetails}>
              {paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod}
            </Text>
            {invoice.bankAccount && invoice.paymentMethod === "TRANSFER" && (
              <>
                <Text style={[styles.companyDetails, { marginTop: 8 }]}>
                  Numer konta bankowego:
                </Text>
                <Text style={styles.bankAccount}>{invoice.bankAccount}</Text>
              </>
            )}
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.sectionTitle}>Uwagi</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 50,
          }}
        >
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>
              Podpis osoby uprawnionej do wystawienia
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>
              Podpis osoby uprawnionej do odbioru
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Wygenerowano w systemie Bakus TMS
          </Text>
          <Text style={styles.footerText}>Strona 1 z 1</Text>
        </View>
      </Page>
    </Document>
  );
}

export type { InvoiceData, InvoiceItem, Contractor, Tenant };
