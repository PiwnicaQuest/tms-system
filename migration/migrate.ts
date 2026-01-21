/**
 * Skrypt migracji danych z Bakus TMS 1.0 (Flask/SQLite) do Bakus TMS 2.0 (Next.js/Prisma/PostgreSQL)
 *
 * Uruchomienie:
 *   npx ts-node migration/migrate.ts
 *
 * lub z dotenv:
 *   npx ts-node -r dotenv/config migration/migrate.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Wczytaj dane z backup JSON
const backupPath = path.join(__dirname, "fleet_backup.json");
const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

// ==================== MAPOWANIA TYPÓW ====================

// Mapowanie typów pojazdów
const vehicleTypeMap: Record<string, string> = {
  ciagnik: "TRUCK",
  ciezarowka: "TRUCK",
  truck: "TRUCK",
  naczepa: "TRAILER",
  trailer: "TRAILER",
  bus: "BUS",
  solowka: "SOLO",
  solo: "SOLO",
  osobowka: "CAR",
  car: "CAR",
};

// Mapowanie statusów pojazdów
const vehicleStatusMap: Record<string, string> = {
  active: "ACTIVE",
  inactive: "INACTIVE",
  in_service: "IN_SERVICE",
  service: "IN_SERVICE",
  sold: "SOLD",
};

// Mapowanie statusów kierowców
const driverStatusMap: Record<string, string> = {
  active: "ACTIVE",
  on_leave: "ON_LEAVE",
  leave: "ON_LEAVE",
  sick: "SICK",
  inactive: "INACTIVE",
  terminated: "TERMINATED",
  fired: "TERMINATED",
};

// Mapowanie typów zatrudnienia
const employmentTypeMap: Record<string, string> = {
  employment: "EMPLOYMENT",
  b2b: "B2B",
  contract: "CONTRACT",
  umowa_o_prace: "EMPLOYMENT",
  dzialalnosc: "B2B",
  umowa_zlecenie: "CONTRACT",
};

// Mapowanie statusów zleceń
const orderStatusMap: Record<string, string> = {
  planned: "PLANNED",
  assigned: "ASSIGNED",
  confirmed: "CONFIRMED",
  loading: "LOADING",
  in_transit: "IN_TRANSIT",
  transit: "IN_TRANSIT",
  unloading: "UNLOADING",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  problem: "PROBLEM",
  delivered: "DELIVERED",
};

// Mapowanie statusów faktur
const invoiceStatusMap: Record<string, string> = {
  draft: "DRAFT",
  issued: "ISSUED",
  sent: "SENT",
  paid: "PAID",
  overdue: "OVERDUE",
  cancelled: "CANCELLED",
};

// Mapowanie typów dokumentów
const documentTypeMap: Record<string, string> = {
  registration: "VEHICLE_REGISTRATION",
  insurance_oc: "VEHICLE_INSURANCE_OC",
  insurance_ac: "VEHICLE_INSURANCE_AC",
  inspection: "VEHICLE_INSPECTION",
  tachograph: "TACHOGRAPH_CALIBRATION",
  license: "DRIVER_LICENSE",
  adr: "DRIVER_ADR",
  medical: "DRIVER_MEDICAL",
  psycho: "DRIVER_PSYCHO",
  qualification: "DRIVER_QUALIFICATION",
  company_license: "COMPANY_LICENSE",
  company_insurance: "COMPANY_INSURANCE",
  cmr: "CMR",
  delivery: "DELIVERY_NOTE",
  other: "OTHER",
};

// Mapowanie ról użytkowników
const userRoleMap: Record<string, string> = {
  admin: "ADMIN",
  management: "MANAGER",
  manager: "MANAGER",
  dispatcher: "DISPATCHER",
  accountant: "ACCOUNTANT",
  employee: "DRIVER",
  driver: "DRIVER",
  viewer: "VIEWER",
};

// ==================== FUNKCJE POMOCNICZE ====================

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function mapEnum<T extends string>(value: string | null, map: Record<string, string>, defaultValue: T): T {
  if (!value) return defaultValue;
  const normalized = value.toLowerCase().trim().replace(/\s+/g, "_");
  return (map[normalized] || defaultValue) as T;
}

function generateEmail(username: string, id: number): string {
  // Konwertuj username na email
  const cleanUsername = username
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Usuń akcenty
    .replace(/[^a-z0-9]/g, "");
  return `${cleanUsername || "user" + id}@bakuslogistics.pl`;
}

// ==================== GŁÓWNA FUNKCJA MIGRACJI ====================

async function migrate() {
  console.log("🚀 Rozpoczynam migrację danych...\n");

  try {
    // Mapowanie starych ID na nowe
    const idMaps = {
      users: new Map<number, string>(),
      vehicles: new Map<number, string>(),
      trailers: new Map<number, string>(),
      drivers: new Map<number, string>(),
      contractors: new Map<number, string>(),
      orders: new Map<number, string>(),
      invoices: new Map<number, string>(),
    };

    // ==================== 1. TENANT ====================
    console.log("📦 Tworzę tenant...");

    let tenant = await prisma.tenant.findFirst({
      where: { slug: "bakus-logistics" },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: "Bakus Logistics",
          slug: "bakus-logistics",
          nip: "1234567890", // Uzupełnij prawdziwy NIP
          address: "ul. Główna 1",
          city: "Wrocław",
          postalCode: "50-001",
          country: "PL",
          phone: "+48 123 456 789",
          email: "biuro@bakuslogistics.pl",
          plan: "PROFESSIONAL",
          isActive: true,
        },
      });
    }
    console.log(`   ✅ Tenant: ${tenant.name} (${tenant.id})\n`);

    // ==================== 2. UŻYTKOWNICY ====================
    console.log("👥 Migruję użytkowników...");

    for (const oldUser of backupData.users || []) {
      const email = generateEmail(oldUser.username, oldUser.id);

      // Sprawdź czy użytkownik już istnieje
      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        const hashedPassword = await bcrypt.hash("BakusTMS2024!", 12);

        user = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            email,
            password: hashedPassword,
            name: oldUser.full_name || oldUser.username,
            phone: oldUser.phone || null,
            role: mapEnum(oldUser.role, userRoleMap, "VIEWER"),
            isActive: oldUser.is_active !== false,
          },
        });
      }

      idMaps.users.set(oldUser.id, user.id);
      console.log(`   ✅ ${oldUser.username} -> ${email}`);
    }
    console.log(`   Łącznie: ${idMaps.users.size} użytkowników\n`);

    // ==================== 3. POJAZDY ====================
    console.log("🚚 Migruję pojazdy...");

    // Pojazdy z tabeli vehicles (bez naczep)
    for (const oldVehicle of backupData.vehicles || []) {
      const oldType = (oldVehicle.vehicle_type || "").toLowerCase();
      const isTrailer = oldType === "naczepa" || oldType === "trailer";

      // Pomijamy naczepy w tej tabeli - zostaną dodane jako Trailer
      if (isTrailer) {
        // Dodaj do trailers map
        const trailer = await prisma.trailer.create({
          data: {
            tenantId: tenant.id,
            registrationNumber: oldVehicle.plate?.trim() || `UNKNOWN-${oldVehicle.id}`,
            type: "CURTAIN", // Domyślny typ naczepy
            brand: null,
            year: null,
            status: mapEnum(oldVehicle.status, vehicleStatusMap, "ACTIVE"),
            notes: oldVehicle.notes || null,
            isActive: true,
          },
        });
        idMaps.trailers.set(oldVehicle.id, trailer.id);
        console.log(`   ✅ Naczepa: ${oldVehicle.plate}`);
        continue;
      }

      // Sprawdź czy pojazd już istnieje
      const existingVehicle = await prisma.vehicle.findFirst({
        where: {
          tenantId: tenant.id,
          registrationNumber: oldVehicle.plate?.trim(),
        },
      });

      if (existingVehicle) {
        idMaps.vehicles.set(oldVehicle.id, existingVehicle.id);
        continue;
      }

      const vehicleType = mapEnum(oldVehicle.vehicle_type, vehicleTypeMap, "TRUCK");

      const vehicle = await prisma.vehicle.create({
        data: {
          tenantId: tenant.id,
          registrationNumber: oldVehicle.plate?.trim() || `UNKNOWN-${oldVehicle.id}`,
          type: vehicleType as any,
          brand: null,
          model: null,
          vin: oldVehicle.vin || null,
          status: mapEnum(oldVehicle.status, vehicleStatusMap, "ACTIVE"),
          fuelType: "DIESEL",
          notes: oldVehicle.notes || null,
          isActive: true,
        },
      });

      idMaps.vehicles.set(oldVehicle.id, vehicle.id);
      console.log(`   ✅ Pojazd: ${oldVehicle.plate}`);
    }
    console.log(`   Łącznie: ${idMaps.vehicles.size} pojazdów\n`);

    // ==================== 4. NACZEPY ====================
    console.log("🚛 Migruję naczepy z osobnej tabeli...");

    for (const oldTrailer of backupData.trailers || []) {
      // Sprawdź czy naczepa już istnieje
      const existingTrailer = await prisma.trailer.findFirst({
        where: {
          tenantId: tenant.id,
          registrationNumber: oldTrailer.plate?.trim(),
        },
      });

      if (existingTrailer) {
        idMaps.trailers.set(oldTrailer.id, existingTrailer.id);
        continue;
      }

      const trailer = await prisma.trailer.create({
        data: {
          tenantId: tenant.id,
          registrationNumber: oldTrailer.plate?.trim() || `TRAILER-${oldTrailer.id}`,
          type: "CURTAIN", // Domyślny typ
          brand: null,
          year: null,
          status: mapEnum(oldTrailer.status, vehicleStatusMap, "ACTIVE"),
          notes: oldTrailer.notes || null,
          isActive: true,
        },
      });

      idMaps.trailers.set(oldTrailer.id, trailer.id);
      console.log(`   ✅ Naczepa: ${oldTrailer.plate}`);
    }
    console.log(`   Łącznie: ${idMaps.trailers.size} naczep\n`);

    // ==================== 5. KIEROWCY ====================
    console.log("👨‍✈️ Migruję kierowców...");

    for (const oldDriver of backupData.drivers || []) {
      // Sprawdź czy kierowca już istnieje (po imieniu i nazwisku)
      const existingDriver = await prisma.driver.findFirst({
        where: {
          tenantId: tenant.id,
          firstName: oldDriver.first_name,
          lastName: oldDriver.last_name,
        },
      });

      if (existingDriver) {
        idMaps.drivers.set(oldDriver.id, existingDriver.id);
        continue;
      }

      const driver = await prisma.driver.create({
        data: {
          tenantId: tenant.id,
          firstName: oldDriver.first_name || "Nieznany",
          lastName: oldDriver.last_name || "Kierowca",
          pesel: oldDriver.pesel || null,
          dateOfBirth: parseDate(oldDriver.birth_date),
          phone: oldDriver.phone || null,
          email: oldDriver.email || null,
          address: oldDriver.address_street || null,
          city: oldDriver.address_city || null,
          postalCode: oldDriver.address_postal_code || null,

          employmentType: mapEnum(oldDriver.contract_type, employmentTypeMap, "EMPLOYMENT"),
          employmentDate: parseDate(oldDriver.employment_date),
          terminationDate: parseDate(oldDriver.termination_date),

          licenseNumber: oldDriver.license_number || null,
          licenseExpiry: parseDate(oldDriver.license_expiry_date),
          licenseCategories: oldDriver.license_category || null,

          adrNumber: oldDriver.adr_certificate ? oldDriver.driver_card_number : null,
          adrExpiry: parseDate(oldDriver.adr_expiry_date),

          medicalExpiry: parseDate(oldDriver.medical_exam_expiry),

          status: mapEnum(oldDriver.status, driverStatusMap, "ACTIVE"),
          notes: oldDriver.notes || null,
          isActive: oldDriver.status !== "terminated",
        },
      });

      idMaps.drivers.set(oldDriver.id, driver.id);
      console.log(`   ✅ ${oldDriver.first_name} ${oldDriver.last_name}`);
    }
    console.log(`   Łącznie: ${idMaps.drivers.size} kierowców\n`);

    // ==================== 6. KONTRAHENCI ====================
    console.log("🏢 Migruję kontrahentów...");

    for (const oldContractor of backupData.contractors || []) {
      // Sprawdź czy kontrahent już istnieje (po NIP lub nazwie)
      const existingContractor = await prisma.contractor.findFirst({
        where: {
          tenantId: tenant.id,
          OR: [{ nip: oldContractor.nip }, { name: oldContractor.name }],
        },
      });

      if (existingContractor) {
        idMaps.contractors.set(oldContractor.id, existingContractor.id);
        continue;
      }

      const contractor = await prisma.contractor.create({
        data: {
          tenantId: tenant.id,
          type: "CLIENT",
          name: oldContractor.name,
          shortName: oldContractor.short_name || null,
          nip: oldContractor.nip || null,
          regon: oldContractor.regon || null,
          address: oldContractor.address || null,
          city: oldContractor.city || null,
          postalCode: oldContractor.postal_code || null,
          country: oldContractor.country || "PL",
          phone: oldContractor.phone || null,
          email: oldContractor.email || null,
          website: oldContractor.website || null,
          contactPerson: oldContractor.contact_person || null,
          paymentDays: oldContractor.payment_terms_days || 14,
          notes: oldContractor.notes || null,
          isActive: oldContractor.status !== "inactive",
        },
      });

      idMaps.contractors.set(oldContractor.id, contractor.id);
      console.log(`   ✅ ${oldContractor.name}`);
    }
    console.log(`   Łącznie: ${idMaps.contractors.size} kontrahentów\n`);

    // ==================== 7. FAKTURY ====================
    console.log("📄 Migruję faktury...");

    for (const oldInvoice of backupData.invoices || []) {
      // Sprawdź czy faktura już istnieje
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          tenantId: tenant.id,
          invoiceNumber: oldInvoice.invoice_number,
        },
      });

      if (existingInvoice) {
        idMaps.invoices.set(oldInvoice.id, existingInvoice.id);
        continue;
      }

      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          invoiceNumber: oldInvoice.invoice_number,
          type: "SINGLE",
          status: mapEnum(oldInvoice.status, invoiceStatusMap, "DRAFT"),
          contractorId: null, // Będzie przypisane później przy zleceniach

          issueDate: parseDate(oldInvoice.issue_date) || new Date(),
          saleDate: parseDate(oldInvoice.invoice_date),
          dueDate: parseDate(oldInvoice.due_date) || new Date(),

          netAmount: oldInvoice.price_netto || 0,
          vatAmount: oldInvoice.vat_amount || 0,
          grossAmount: oldInvoice.price_brutto || 0,
          currency: oldInvoice.currency || "PLN",

          paymentMethod: "TRANSFER",
          isPaid: oldInvoice.status === "paid",
          paidDate: parseDate(oldInvoice.payment_date),

          ksefNumber: oldInvoice.ksef_number || null,
          ksefSentAt: parseDate(oldInvoice.ksef_sent_at),

          notes: oldInvoice.notes || null,
        },
      });

      idMaps.invoices.set(oldInvoice.id, invoice.id);
      console.log(`   ✅ ${oldInvoice.invoice_number}`);
    }
    console.log(`   Łącznie: ${idMaps.invoices.size} faktur\n`);

    // ==================== 8. ZLECENIA ====================
    console.log("📋 Migruję zlecenia...");

    for (const oldOrder of backupData.orders || []) {
      // Sprawdź czy zlecenie już istnieje
      const existingOrder = await prisma.order.findFirst({
        where: {
          tenantId: tenant.id,
          orderNumber: oldOrder.order_number,
        },
      });

      if (existingOrder) {
        idMaps.orders.set(oldOrder.id, existingOrder.id);
        continue;
      }

      // Znajdź lub utwórz kontrahenta na podstawie danych z zamówienia
      let contractorId: string | null = null;
      if (oldOrder.customer_name) {
        const contractor = await prisma.contractor.findFirst({
          where: {
            tenantId: tenant.id,
            name: oldOrder.customer_name,
          },
        });
        contractorId = contractor?.id || null;
      }

      const order = await prisma.order.create({
        data: {
          tenantId: tenant.id,
          orderNumber: oldOrder.order_number || `ZL-${oldOrder.id}`,
          type: oldOrder.order_type === "forwarding" ? "FORWARDING" : "OWN",
          status: mapEnum(oldOrder.status, orderStatusMap, "PLANNED"),

          contractorId,

          vehicleId: oldOrder.vehicle_id ? idMaps.vehicles.get(oldOrder.vehicle_id) || null : null,
          trailerId: oldOrder.trailer_id ? idMaps.trailers.get(oldOrder.trailer_id) || null : null,
          driverId: oldOrder.driver_id ? idMaps.drivers.get(oldOrder.driver_id) || null : null,

          origin: oldOrder.origin || "Nieznane",
          destination: oldOrder.destination || "Nieznane",
          distanceKm: oldOrder.distance_km || null,

          loadingDate: parseDate(oldOrder.planned_start_date) || new Date(),
          unloadingDate: parseDate(oldOrder.planned_end_date) || new Date(),

          cargoDescription: oldOrder.cargo_description || null,
          cargoWeight: oldOrder.cargo_weight_kg || null,
          cargoValue: oldOrder.cargo_value || null,
          requiresAdr: oldOrder.requires_adr || false,

          priceNet: oldOrder.price || null,
          currency: oldOrder.currency || "PLN",
          costNet: oldOrder.cost || null,

          flatRateKm: oldOrder.flat_rate_km || null,
          kmLimit: oldOrder.km_limit || null,
          kmOverageRate: oldOrder.km_overage_rate || null,

          notes: oldOrder.notes || null,

          invoiceId: oldOrder.invoice_id ? idMaps.invoices.get(oldOrder.invoice_id) || null : null,
        },
      });

      idMaps.orders.set(oldOrder.id, order.id);
      console.log(`   ✅ ${oldOrder.order_number}`);
    }
    console.log(`   Łącznie: ${idMaps.orders.size} zleceń\n`);

    // ==================== 9. DOKUMENTY ====================
    console.log("📎 Migruję dokumenty...");

    let documentsCount = 0;
    for (const oldDoc of backupData.documents || []) {
      // Określ powiązanie dokumentu
      let vehicleId: string | null = null;
      let trailerId: string | null = null;
      let driverId: string | null = null;

      if (oldDoc.vehicle_type === "vehicle" && oldDoc.vehicle_id) {
        vehicleId = idMaps.vehicles.get(oldDoc.vehicle_id) || null;
        // Jeśli nie znaleziono jako pojazd, sprawdź naczepy
        if (!vehicleId) {
          trailerId = idMaps.trailers.get(oldDoc.vehicle_id) || null;
        }
      } else if (oldDoc.vehicle_type === "trailer" && oldDoc.vehicle_id) {
        trailerId = idMaps.trailers.get(oldDoc.vehicle_id) || null;
      } else if (oldDoc.vehicle_type === "driver" && oldDoc.vehicle_id) {
        driverId = idMaps.drivers.get(oldDoc.vehicle_id) || null;
      }

      // Konwertuj ścieżkę pliku
      const newFileUrl = oldDoc.file_path
        ? `/uploads/migration/${oldDoc.file_path.replace("uploads/", "")}`
        : null;

      if (!newFileUrl) continue;

      await prisma.document.create({
        data: {
          tenantId: tenant.id,
          type: mapEnum(oldDoc.document_type, documentTypeMap, "OTHER") as any,
          name: oldDoc.title || oldDoc.file_name || "Dokument",
          description: oldDoc.description || null,
          fileUrl: newFileUrl,
          fileSize: oldDoc.file_size || null,
          mimeType: oldDoc.mime_type || null,
          expiryDate: parseDate(oldDoc.expiry_date),
          vehicleId,
          trailerId,
          driverId,
        },
      });

      documentsCount++;
    }
    console.log(`   Łącznie: ${documentsCount} dokumentów\n`);

    // ==================== PODSUMOWANIE ====================
    console.log("=" .repeat(50));
    console.log("✅ MIGRACJA ZAKOŃCZONA POMYŚLNIE!");
    console.log("=" .repeat(50));
    console.log(`
📊 Podsumowanie:
   - Tenant:       ${tenant.name}
   - Użytkownicy:  ${idMaps.users.size}
   - Pojazdy:      ${idMaps.vehicles.size}
   - Naczepy:      ${idMaps.trailers.size}
   - Kierowcy:     ${idMaps.drivers.size}
   - Kontrahenci:  ${idMaps.contractors.size}
   - Faktury:      ${idMaps.invoices.size}
   - Zlecenia:     ${idMaps.orders.size}
   - Dokumenty:    ${documentsCount}

🔑 Domyślne hasło dla wszystkich użytkowników: BakusTMS2024!
   Użytkownicy powinni zmienić hasło przy pierwszym logowaniu.

📁 Pliki z folderu migration/uploads należy skopiować do:
   public/uploads/migration/
`);

    // Zapisz mapowania ID do pliku (przydatne do debugowania)
    const mappingsFile = path.join(__dirname, "id_mappings.json");
    const mappings = {
      users: Object.fromEntries(idMaps.users),
      vehicles: Object.fromEntries(idMaps.vehicles),
      trailers: Object.fromEntries(idMaps.trailers),
      drivers: Object.fromEntries(idMaps.drivers),
      contractors: Object.fromEntries(idMaps.contractors),
      orders: Object.fromEntries(idMaps.orders),
      invoices: Object.fromEntries(idMaps.invoices),
    };
    fs.writeFileSync(mappingsFile, JSON.stringify(mappings, null, 2));
    console.log(`📄 Mapowania ID zapisane do: ${mappingsFile}`);

  } catch (error) {
    console.error("❌ Błąd podczas migracji:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Uruchom migrację
migrate();
