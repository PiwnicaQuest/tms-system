import Papa from "papaparse";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export type ImportType = "drivers" | "vehicles" | "contractors";

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: Record<string, string>;
  }>;
}

export interface ColumnMapping {
  csvColumn: string;
  dbField: string;
}

// Expected columns for each import type
export const expectedColumns: Record<ImportType, { required: string[]; optional: string[] }> = {
  drivers: {
    required: ["firstName", "lastName"],
    optional: [
      "pesel",
      "phone",
      "email",
      "address",
      "city",
      "postalCode",
      "employmentType",
      "employmentDate",
      "licenseNumber",
      "licenseExpiry",
      "licenseCategories",
      "adrNumber",
      "adrExpiry",
      "adrClasses",
      "medicalExpiry",
      "notes",
    ],
  },
  vehicles: {
    required: ["registrationNumber", "type"],
    optional: [
      "brand",
      "model",
      "vin",
      "year",
      "loadCapacity",
      "volume",
      "euroClass",
      "fuelType",
      "notes",
    ],
  },
  contractors: {
    required: ["name", "type"],
    optional: [
      "shortName",
      "nip",
      "regon",
      "address",
      "city",
      "postalCode",
      "country",
      "phone",
      "email",
      "website",
      "contactPerson",
      "contactPhone",
      "contactEmail",
      "paymentDays",
      "creditLimit",
      "notes",
    ],
  },
};

// CSV templates
export const csvTemplates: Record<ImportType, string> = {
  drivers: `firstName;lastName;pesel;phone;email;address;city;postalCode;employmentType;licenseNumber;licenseExpiry;licenseCategories;adrNumber;adrExpiry;medicalExpiry;notes
Jan;Kowalski;90010112345;+48600111222;jan.kowalski@email.pl;ul. Przykladowa 1;Warszawa;00-001;EMPLOYMENT;ABC123456;2025-12-31;C,CE;ADR123;2025-06-30;2025-03-15;Doswiadczony kierowca
Anna;Nowak;85050567890;+48600333444;anna.nowak@email.pl;ul. Testowa 5;Krakow;30-001;B2B;XYZ789012;2026-06-30;C,CE,D;;;2025-09-20;`,

  vehicles: `registrationNumber;type;brand;model;vin;year;loadCapacity;volume;euroClass;fuelType;notes
WI12345;TRUCK;Volvo;FH16;YV2RT40A5XA123456;2022;24000;90;EURO6;DIESEL;Ciezarowka z naczepą
WA67890;SOLO;Mercedes;Actros;WDB9340321L123456;2021;12000;45;EURO6;DIESEL;Solowka`,

  contractors: `name;type;shortName;nip;regon;address;city;postalCode;country;phone;email;contactPerson;paymentDays;notes
Firma Transportowa ABC;CLIENT;ABC;1234567890;123456789;ul. Handlowa 10;Warszawa;00-100;PL;+48221234567;kontakt@abc.pl;Jan Klient;14;Staly klient
Przewoznik XYZ;CARRIER;XYZ;0987654321;987654321;ul. Logistyczna 5;Lodz;90-001;PL;+48426543210;biuro@xyz.pl;Anna Przewoznik;21;Podwykonawca`,
};

// Parse CSV content
export function parseCSV(content: string): Papa.ParseResult<Record<string, string>> {
  return Papa.parse<Record<string, string>>(content, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });
}

// Validate row data
function validateRow(
  row: Record<string, string>,
  type: ImportType,
  rowIndex: number
): { valid: boolean; errors: ImportResult["errors"] } {
  const errors: ImportResult["errors"] = [];
  const { required } = expectedColumns[type];

  for (const field of required) {
    if (!row[field] || row[field].trim() === "") {
      errors.push({
        row: rowIndex,
        field,
        message: `Brak wymaganego pola: ${field}`,
        data: row,
      });
    }
  }

  // Type-specific validations
  if (type === "drivers") {
    if (row.email && !isValidEmail(row.email)) {
      errors.push({ row: rowIndex, field: "email", message: "Nieprawidlowy format email" });
    }
    if (row.licenseExpiry && !isValidDate(row.licenseExpiry)) {
      errors.push({ row: rowIndex, field: "licenseExpiry", message: "Nieprawidlowy format daty (YYYY-MM-DD)" });
    }
    if (row.employmentType && !["EMPLOYMENT", "B2B", "CONTRACT"].includes(row.employmentType)) {
      errors.push({ row: rowIndex, field: "employmentType", message: "Nieprawidlowy typ zatrudnienia (EMPLOYMENT/B2B/CONTRACT)" });
    }
  }

  if (type === "vehicles") {
    if (!["TRUCK", "BUS", "SOLO", "TRAILER", "CAR"].includes(row.type)) {
      errors.push({ row: rowIndex, field: "type", message: "Nieprawidlowy typ pojazdu (TRUCK/BUS/SOLO/TRAILER/CAR)" });
    }
    if (row.fuelType && !["DIESEL", "PETROL", "LPG", "ELECTRIC", "HYBRID"].includes(row.fuelType)) {
      errors.push({ row: rowIndex, field: "fuelType", message: "Nieprawidlowy typ paliwa" });
    }
  }

  if (type === "contractors") {
    if (!["CLIENT", "CARRIER", "BOTH"].includes(row.type)) {
      errors.push({ row: rowIndex, field: "type", message: "Nieprawidlowy typ kontrahenta (CLIENT/CARRIER/BOTH)" });
    }
    if (row.email && !isValidEmail(row.email)) {
      errors.push({ row: rowIndex, field: "email", message: "Nieprawidlowy format email" });
    }
  }

  return { valid: errors.length === 0, errors };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

// Import drivers
async function importDrivers(
  rows: Record<string, string>[],
  tenantId: string
): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const validation = validateRow(row, "drivers", i + 2); // +2 for header and 0-index

    if (!validation.valid) {
      result.errors.push(...validation.errors);
      result.skipped++;
      continue;
    }

    try {
      // Check for duplicate (by PESEL or name)
      const existing = row.pesel
        ? await prisma.driver.findFirst({
            where: { tenantId, pesel: row.pesel },
          })
        : await prisma.driver.findFirst({
            where: {
              tenantId,
              firstName: row.firstName,
              lastName: row.lastName,
            },
          });

      if (existing) {
        result.errors.push({
          row: i + 2,
          message: `Kierowca juz istnieje: ${row.firstName} ${row.lastName}`,
        });
        result.skipped++;
        continue;
      }

      await prisma.driver.create({
        data: {
          tenantId,
          firstName: row.firstName,
          lastName: row.lastName,
          pesel: row.pesel || null,
          phone: row.phone || null,
          email: row.email || null,
          address: row.address || null,
          city: row.city || null,
          postalCode: row.postalCode || null,
          employmentType: (row.employmentType as "EMPLOYMENT" | "B2B" | "CONTRACT") || "EMPLOYMENT",
          employmentDate: row.employmentDate ? new Date(row.employmentDate) : null,
          licenseNumber: row.licenseNumber || null,
          licenseExpiry: row.licenseExpiry ? new Date(row.licenseExpiry) : null,
          licenseCategories: row.licenseCategories || null,
          adrNumber: row.adrNumber || null,
          adrExpiry: row.adrExpiry ? new Date(row.adrExpiry) : null,
          adrClasses: row.adrClasses || null,
          medicalExpiry: row.medicalExpiry ? new Date(row.medicalExpiry) : null,
          notes: row.notes || null,
        },
      });

      result.imported++;
    } catch (error) {
      result.errors.push({
        row: i + 2,
        message: `Blad importu: ${error instanceof Error ? error.message : "Nieznany blad"}`,
      });
      result.skipped++;
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Import vehicles
async function importVehicles(
  rows: Record<string, string>[],
  tenantId: string
): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const validation = validateRow(row, "vehicles", i + 2);

    if (!validation.valid) {
      result.errors.push(...validation.errors);
      result.skipped++;
      continue;
    }

    try {
      // Check for duplicate registration number
      const existing = await prisma.vehicle.findFirst({
        where: { tenantId, registrationNumber: row.registrationNumber },
      });

      if (existing) {
        result.errors.push({
          row: i + 2,
          message: `Pojazd juz istnieje: ${row.registrationNumber}`,
        });
        result.skipped++;
        continue;
      }

      await prisma.vehicle.create({
        data: {
          tenantId,
          registrationNumber: row.registrationNumber,
          type: row.type as "TRUCK" | "BUS" | "SOLO" | "TRAILER" | "CAR",
          brand: row.brand || null,
          model: row.model || null,
          vin: row.vin || null,
          year: row.year ? parseInt(row.year) : null,
          loadCapacity: row.loadCapacity ? parseFloat(row.loadCapacity) : null,
          volume: row.volume ? parseFloat(row.volume) : null,
          euroClass: row.euroClass || null,
          fuelType: row.fuelType as "DIESEL" | "PETROL" | "LPG" | "ELECTRIC" | "HYBRID" | undefined,
          notes: row.notes || null,
        },
      });

      result.imported++;
    } catch (error) {
      result.errors.push({
        row: i + 2,
        message: `Blad importu: ${error instanceof Error ? error.message : "Nieznany blad"}`,
      });
      result.skipped++;
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Import contractors
async function importContractors(
  rows: Record<string, string>[],
  tenantId: string
): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const validation = validateRow(row, "contractors", i + 2);

    if (!validation.valid) {
      result.errors.push(...validation.errors);
      result.skipped++;
      continue;
    }

    try {
      // Check for duplicate (by NIP or name)
      const existing = row.nip
        ? await prisma.contractor.findFirst({
            where: { tenantId, nip: row.nip },
          })
        : await prisma.contractor.findFirst({
            where: { tenantId, name: row.name },
          });

      if (existing) {
        result.errors.push({
          row: i + 2,
          message: `Kontrahent juz istnieje: ${row.name}`,
        });
        result.skipped++;
        continue;
      }

      await prisma.contractor.create({
        data: {
          tenantId,
          name: row.name,
          type: row.type as "CLIENT" | "CARRIER" | "BOTH",
          shortName: row.shortName || null,
          nip: row.nip || null,
          regon: row.regon || null,
          address: row.address || null,
          city: row.city || null,
          postalCode: row.postalCode || null,
          country: row.country || "PL",
          phone: row.phone || null,
          email: row.email || null,
          website: row.website || null,
          contactPerson: row.contactPerson || null,
          contactPhone: row.contactPhone || null,
          contactEmail: row.contactEmail || null,
          paymentDays: row.paymentDays ? parseInt(row.paymentDays) : 14,
          creditLimit: row.creditLimit ? parseFloat(row.creditLimit) : null,
          notes: row.notes || null,
        },
      });

      result.imported++;
    } catch (error) {
      result.errors.push({
        row: i + 2,
        message: `Blad importu: ${error instanceof Error ? error.message : "Nieznany blad"}`,
      });
      result.skipped++;
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Main import function
export async function importCSV(
  content: string,
  type: ImportType,
  tenantId: string
): Promise<ImportResult> {
  const parsed = parseCSV(content);

  if (parsed.errors.length > 0) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: parsed.errors.map((e, i) => ({
        row: e.row || i,
        message: e.message,
      })),
    };
  }

  if (parsed.data.length === 0) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [{ row: 0, message: "Plik CSV jest pusty" }],
    };
  }

  switch (type) {
    case "drivers":
      return importDrivers(parsed.data, tenantId);
    case "vehicles":
      return importVehicles(parsed.data, tenantId);
    case "contractors":
      return importContractors(parsed.data, tenantId);
    default:
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, message: `Nieobslugiwany typ importu: ${type}` }],
      };
  }
}
