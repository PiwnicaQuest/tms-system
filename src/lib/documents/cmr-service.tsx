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

// CMR Document Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 8,
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
    paddingBottom: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#333333",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: "bold",
  },
  mainContainer: {
    flexDirection: "row",
    flex: 1,
  },
  leftColumn: {
    width: "50%",
    paddingRight: 5,
  },
  rightColumn: {
    width: "50%",
    paddingLeft: 5,
  },
  box: {
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 5,
    padding: 5,
    minHeight: 50,
  },
  boxSmall: {
    minHeight: 35,
  },
  boxLarge: {
    minHeight: 70,
  },
  boxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  boxNumber: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000000",
    backgroundColor: "#e0e0e0",
    padding: "2 4",
  },
  boxTitle: {
    fontSize: 7,
    color: "#666666",
    textTransform: "uppercase",
  },
  boxContent: {
    fontSize: 8,
    color: "#000000",
  },
  boxContentBold: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000000",
  },
  row: {
    flexDirection: "row",
    marginBottom: 2,
  },
  label: {
    fontSize: 7,
    color: "#666666",
    width: 60,
  },
  value: {
    fontSize: 8,
    color: "#000000",
    flex: 1,
  },
  signatureBox: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 5,
    minHeight: 60,
    marginBottom: 5,
  },
  signatureTitle: {
    fontSize: 7,
    color: "#666666",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#666666",
    marginTop: 30,
    paddingTop: 3,
  },
  signatureLabel: {
    fontSize: 6,
    color: "#666666",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
    paddingTop: 5,
  },
  footerText: {
    fontSize: 6,
    color: "#999999",
  },
  twoColumnRow: {
    flexDirection: "row",
  },
  halfBox: {
    width: "50%",
    borderWidth: 1,
    borderColor: "#000000",
    padding: 5,
    minHeight: 40,
  },
  threeColumnRow: {
    flexDirection: "row",
  },
  thirdBox: {
    width: "33.33%",
    borderWidth: 1,
    borderColor: "#000000",
    padding: 5,
    minHeight: 40,
  },
  cargoTable: {
    marginTop: 3,
  },
  cargoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    paddingVertical: 2,
  },
  cargoHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  cargoCol1: {
    width: "40%",
    fontSize: 7,
  },
  cargoCol2: {
    width: "20%",
    fontSize: 7,
    textAlign: "center",
  },
  cargoCol3: {
    width: "20%",
    fontSize: 7,
    textAlign: "center",
  },
  cargoCol4: {
    width: "20%",
    fontSize: 7,
    textAlign: "center",
  },
});

// Types for CMR data
export interface CMRContractor {
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  nip: string | null;
  phone: string | null;
  email: string | null;
}

export interface CMRTenant {
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  nip: string | null;
  phone: string | null;
  email: string | null;
}

export interface CMRDriver {
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface CMRVehicle {
  registrationNumber: string;
  brand: string | null;
  model: string | null;
}

export interface CMRTrailer {
  registrationNumber: string;
}

export interface CMROrderData {
  orderNumber: string;
  externalNumber: string | null;
  // Route
  origin: string;
  originCity: string | null;
  originCountry: string;
  destination: string;
  destinationCity: string | null;
  destinationCountry: string;
  // Dates
  loadingDate: Date;
  unloadingDate: Date;
  // Cargo
  cargoDescription: string | null;
  cargoWeight: number | null;
  cargoVolume: number | null;
  cargoPallets: number | null;
  // Notes
  notes: string | null;
  // Relations
  contractor: CMRContractor | null;
  tenant: CMRTenant;
  driver: CMRDriver | null;
  vehicle: CMRVehicle | null;
  trailer: CMRTrailer | null;
}

// Country names in Polish
const countryNames: Record<string, string> = {
  PL: "Polska",
  DE: "Niemcy",
  CZ: "Czechy",
  SK: "Slowacja",
  AT: "Austria",
  NL: "Holandia",
  BE: "Belgia",
  FR: "Francja",
  IT: "Wlochy",
  ES: "Hiszpania",
  GB: "Wielka Brytania",
  DK: "Dania",
  SE: "Szwecja",
  HU: "Wegry",
  RO: "Rumunia",
  BG: "Bulgaria",
  LT: "Litwa",
  LV: "Lotwa",
  EE: "Estonia",
  CH: "Szwajcaria",
  UA: "Ukraina",
  BY: "Bialorus",
  RU: "Rosja",
};

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

function formatAddress(
  address: string | null,
  city: string | null,
  postalCode: string | null,
  country: string
): string {
  const parts: string[] = [];
  if (address) parts.push(address);
  if (postalCode && city) {
    parts.push(`${postalCode} ${city}`);
  } else if (city) {
    parts.push(city);
  }
  parts.push(countryNames[country] || country);
  return parts.join(", ");
}

function getCountryName(code: string): string {
  return countryNames[code] || code;
}

// CMR PDF Component
export function CMRPDF({ order }: { order: CMROrderData }) {
  const { contractor, tenant, driver, vehicle, trailer } = order;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>CMR</Text>
            <Text style={styles.headerSubtitle}>
              Miedzynarodowy list przewozowy
            </Text>
            <Text style={styles.headerSubtitle}>
              (Konwencja o umowie miedzynarodowego przewozu drogowego towarow)
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.orderNumber}>Nr: {order.orderNumber}</Text>
            {order.externalNumber && (
              <Text style={styles.headerSubtitle}>
                Nr zewn.: {order.externalNumber}
              </Text>
            )}
          </View>
        </View>

        {/* Main Content - Two Columns */}
        <View style={styles.mainContainer}>
          {/* Left Column */}
          <View style={styles.leftColumn}>
            {/* Box 1 - Sender (Nadawca) */}
            <View style={styles.box}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>1</Text>
                <Text style={styles.boxTitle}>
                  Nadawca (nazwa, adres, kraj)
                </Text>
              </View>
              {contractor ? (
                <View>
                  <Text style={styles.boxContentBold}>{contractor.name}</Text>
                  <Text style={styles.boxContent}>
                    {formatAddress(
                      contractor.address,
                      contractor.city,
                      contractor.postalCode,
                      contractor.country
                    )}
                  </Text>
                  {contractor.nip && (
                    <Text style={styles.boxContent}>NIP: {contractor.nip}</Text>
                  )}
                  {contractor.phone && (
                    <Text style={styles.boxContent}>
                      Tel: {contractor.phone}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.boxContent}>-</Text>
              )}
            </View>

            {/* Box 2 - Consignee (Odbiorca) */}
            <View style={styles.box}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>2</Text>
                <Text style={styles.boxTitle}>
                  Odbiorca (nazwa, adres, kraj)
                </Text>
              </View>
              <View>
                <Text style={styles.boxContentBold}>{order.destination}</Text>
                {order.destinationCity && (
                  <Text style={styles.boxContent}>
                    {order.destinationCity},{" "}
                    {getCountryName(order.destinationCountry)}
                  </Text>
                )}
              </View>
            </View>

            {/* Box 3 - Place of delivery */}
            <View style={styles.box}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>3</Text>
                <Text style={styles.boxTitle}>
                  Miejsce przeznaczenia (adres, kraj)
                </Text>
              </View>
              <View>
                <Text style={styles.boxContent}>{order.destination}</Text>
                {order.destinationCity && (
                  <Text style={styles.boxContent}>
                    {order.destinationCity},{" "}
                    {getCountryName(order.destinationCountry)}
                  </Text>
                )}
              </View>
            </View>

            {/* Box 4 - Place and date of taking over */}
            <View style={styles.box}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>4</Text>
                <Text style={styles.boxTitle}>
                  Miejsce i data przyjecia towaru
                </Text>
              </View>
              <View>
                <Text style={styles.boxContent}>{order.origin}</Text>
                {order.originCity && (
                  <Text style={styles.boxContent}>
                    {order.originCity}, {getCountryName(order.originCountry)}
                  </Text>
                )}
                <Text style={styles.boxContentBold}>
                  Data: {formatDate(order.loadingDate)}
                </Text>
              </View>
            </View>

            {/* Box 5 - Documents attached */}
            <View style={[styles.box, styles.boxSmall]}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>5</Text>
                <Text style={styles.boxTitle}>Zalaczone dokumenty</Text>
              </View>
              <Text style={styles.boxContent}>-</Text>
            </View>

            {/* Boxes 6-9 - Cargo details */}
            <View style={styles.box}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>6-9</Text>
                <Text style={styles.boxTitle}>Opis towaru</Text>
              </View>
              <View style={styles.cargoTable}>
                <View style={[styles.cargoRow, styles.cargoHeader]}>
                  <Text style={styles.cargoCol1}>Oznaczenie/Opis</Text>
                  <Text style={styles.cargoCol2}>Waga (kg)</Text>
                  <Text style={styles.cargoCol3}>Objetosc (m3)</Text>
                  <Text style={styles.cargoCol4}>Palety (szt)</Text>
                </View>
                <View style={styles.cargoRow}>
                  <Text style={styles.cargoCol1}>
                    {order.cargoDescription || "-"}
                  </Text>
                  <Text style={styles.cargoCol2}>
                    {order.cargoWeight
                      ? order.cargoWeight.toLocaleString("pl-PL")
                      : "-"}
                  </Text>
                  <Text style={styles.cargoCol3}>
                    {order.cargoVolume
                      ? order.cargoVolume.toLocaleString("pl-PL")
                      : "-"}
                  </Text>
                  <Text style={styles.cargoCol4}>
                    {order.cargoPallets || "-"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Box 10-12 - Statistics (not required) */}
            <View style={[styles.box, styles.boxSmall]}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>10-12</Text>
                <Text style={styles.boxTitle}>
                  Dane statystyczne (klasa, nr, waga brutto)
                </Text>
              </View>
              <Text style={styles.boxContent}>-</Text>
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.rightColumn}>
            {/* Box 13 - Sender's instructions */}
            <View style={styles.box}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>13</Text>
                <Text style={styles.boxTitle}>Instrukcje nadawcy</Text>
              </View>
              <Text style={styles.boxContent}>{order.notes || "-"}</Text>
            </View>

            {/* Box 14 - Payment instructions */}
            <View style={[styles.box, styles.boxSmall]}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>14</Text>
                <Text style={styles.boxTitle}>
                  Przepisy dot. przewozu i oplat
                </Text>
              </View>
              <Text style={styles.boxContent}>Fracht oplacony</Text>
            </View>

            {/* Box 15 - Cash on delivery */}
            <View style={[styles.box, styles.boxSmall]}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>15</Text>
                <Text style={styles.boxTitle}>Zaliczenie (pobranie)</Text>
              </View>
              <Text style={styles.boxContent}>-</Text>
            </View>

            {/* Box 16 - Carrier (Przewoznik) */}
            <View style={styles.box}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>16</Text>
                <Text style={styles.boxTitle}>
                  Przewoznik (nazwa, adres, kraj)
                </Text>
              </View>
              <View>
                <Text style={styles.boxContentBold}>{tenant.name}</Text>
                <Text style={styles.boxContent}>
                  {formatAddress(
                    tenant.address,
                    tenant.city,
                    tenant.postalCode,
                    tenant.country
                  )}
                </Text>
                {tenant.nip && (
                  <Text style={styles.boxContent}>NIP: {tenant.nip}</Text>
                )}
                {tenant.phone && (
                  <Text style={styles.boxContent}>Tel: {tenant.phone}</Text>
                )}
              </View>
            </View>

            {/* Box 17 - Successive carriers */}
            <View style={[styles.box, styles.boxSmall]}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>17</Text>
                <Text style={styles.boxTitle}>Kolejni przewoznicy</Text>
              </View>
              <Text style={styles.boxContent}>-</Text>
            </View>

            {/* Box 18-21 - Reservations */}
            <View style={styles.box}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>18-21</Text>
                <Text style={styles.boxTitle}>
                  Zastrzezenia i uwagi przewoznika
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Pojazd:</Text>
                <Text style={styles.value}>
                  {vehicle
                    ? `${vehicle.registrationNumber}${
                        vehicle.brand ? ` (${vehicle.brand} ${vehicle.model || ""})` : ""
                      }`
                    : "-"}
                </Text>
              </View>
              {trailer && (
                <View style={styles.row}>
                  <Text style={styles.label}>Naczepa:</Text>
                  <Text style={styles.value}>{trailer.registrationNumber}</Text>
                </View>
              )}
              {driver && (
                <View style={styles.row}>
                  <Text style={styles.label}>Kierowca:</Text>
                  <Text style={styles.value}>
                    {driver.firstName} {driver.lastName}
                    {driver.phone ? `, tel: ${driver.phone}` : ""}
                  </Text>
                </View>
              )}
            </View>

            {/* Date of unloading */}
            <View style={[styles.box, styles.boxSmall]}>
              <View style={styles.boxHeader}>
                <Text style={styles.boxNumber}>-</Text>
                <Text style={styles.boxTitle}>Planowana data dostawy</Text>
              </View>
              <Text style={styles.boxContentBold}>
                {formatDate(order.unloadingDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Signatures - Bottom section */}
        <View style={styles.threeColumnRow}>
          {/* Box 22 - Sender's signature */}
          <View style={styles.signatureBox}>
            <View style={styles.boxHeader}>
              <Text style={styles.boxNumber}>22</Text>
              <Text style={styles.signatureTitle}>
                Podpis i pieczec nadawcy
              </Text>
            </View>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>
                Miejsce, data, podpis nadawcy
              </Text>
            </View>
          </View>

          {/* Box 23 - Carrier's signature */}
          <View style={styles.signatureBox}>
            <View style={styles.boxHeader}>
              <Text style={styles.boxNumber}>23</Text>
              <Text style={styles.signatureTitle}>
                Podpis i pieczec przewoznika
              </Text>
            </View>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>
                Miejsce, data, podpis przewoznika
              </Text>
            </View>
          </View>

          {/* Box 24 - Consignee's signature */}
          <View style={styles.signatureBox}>
            <View style={styles.boxHeader}>
              <Text style={styles.boxNumber}>24</Text>
              <Text style={styles.signatureTitle}>
                Podpis i pieczec odbiorcy
              </Text>
            </View>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>
                Miejsce, data, podpis odbiorcy
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Wygenerowano w systemie Bakus TMS - {formatDate(new Date())}
          </Text>
          <Text style={styles.footerText}>
            CMR - Miedzynarodowy list przewozowy
          </Text>
        </View>
      </Page>
    </Document>
  );
}
