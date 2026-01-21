import { OpenAPIV3 } from "openapi-types";

export const openApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "Bakus TMS API",
    version: "1.0.0",
    description: `
# Bakus TMS API

API systemu zarządzania transportem Bakus TMS (Transport Management System).

## Uwierzytelnianie

API wykorzystuje uwierzytelnianie oparte na sesjach. Wszystkie endpointy wymagają aktywnej sesji użytkownika.

## Multi-tenancy

System obsługuje wielu najemców (multi-tenancy). Wszystkie dane są izolowane per tenant - użytkownik ma dostęp tylko do danych swojej organizacji.

## Odpowiedzi błędów

API zwraca błędy w formacie JSON z odpowiednim kodem HTTP:
- \`400\` - Nieprawidłowe żądanie (błędy walidacji)
- \`401\` - Nieautoryzowany (brak sesji)
- \`403\` - Zabroniony (brak uprawnień)
- \`404\` - Nie znaleziono
- \`409\` - Konflikt (np. duplikat)
- \`500\` - Błąd serwera
    `,
    contact: {
      name: "Bakus TMS Support",
      email: "support@bakus-tms.pl",
    },
  },
  servers: [
    {
      url: "/api",
      description: "API Server",
    },
  ],
  tags: [
    {
      name: "Orders",
      description: "Zarządzanie zleceniami transportowymi",
    },
    {
      name: "Invoices",
      description: "Zarządzanie fakturami",
    },
    {
      name: "Vehicles",
      description: "Zarządzanie flotą pojazdów",
    },
    {
      name: "Drivers",
      description: "Zarządzanie kierowcami",
    },
    {
      name: "Contractors",
      description: "Zarządzanie kontrahentami (klienci, przewoźnicy)",
    },
    {
      name: "Trailers",
      description: "Zarządzanie naczepami",
    },
  ],
  components: {
    securitySchemes: {
      sessionAuth: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "Token sesji NextAuth",
      },
    },
    schemas: {
      // Common schemas
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", description: "Numer strony", example: 1 },
          limit: { type: "integer", description: "Limit wyników na stronie", example: 20 },
          total: { type: "integer", description: "Łączna liczba wyników", example: 100 },
          totalPages: { type: "integer", description: "Łączna liczba stron", example: 5 },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string", description: "Komunikat błędu" },
          details: { type: "object", description: "Szczegóły błędu (dla błędów walidacji)" },
        },
        required: ["error"],
      },

      // Enums
      OrderStatus: {
        type: "string",
        enum: ["PLANNED", "ASSIGNED", "CONFIRMED", "LOADING", "IN_TRANSIT", "UNLOADING", "COMPLETED", "CANCELLED", "PROBLEM"],
        description: "Status zlecenia",
      },
      OrderType: {
        type: "string",
        enum: ["OWN", "FORWARDING"],
        description: "Typ zlecenia (własny transport / spedycja)",
      },
      VehicleType: {
        type: "string",
        enum: ["TRUCK", "BUS", "SOLO", "TRAILER", "CAR"],
        description: "Typ pojazdu",
      },
      VehicleStatus: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE", "IN_SERVICE", "SOLD"],
        description: "Status pojazdu",
      },
      FuelType: {
        type: "string",
        enum: ["DIESEL", "PETROL", "LPG", "ELECTRIC", "HYBRID"],
        description: "Typ paliwa",
      },
      DriverStatus: {
        type: "string",
        enum: ["ACTIVE", "ON_LEAVE", "SICK", "INACTIVE", "TERMINATED"],
        description: "Status kierowcy",
      },
      EmploymentType: {
        type: "string",
        enum: ["EMPLOYMENT", "B2B", "CONTRACT"],
        description: "Typ zatrudnienia",
      },
      ContractorType: {
        type: "string",
        enum: ["CLIENT", "CARRIER", "BOTH"],
        description: "Typ kontrahenta",
      },
      InvoiceStatus: {
        type: "string",
        enum: ["DRAFT", "ISSUED", "SENT", "PAID", "OVERDUE", "CANCELLED"],
        description: "Status faktury",
      },
      InvoiceType: {
        type: "string",
        enum: ["SINGLE", "COLLECTIVE", "PROFORMA", "CORRECTION"],
        description: "Typ faktury",
      },
      PaymentMethod: {
        type: "string",
        enum: ["TRANSFER", "CASH", "CARD"],
        description: "Metoda płatności",
      },

      // Order schemas
      Order: {
        type: "object",
        properties: {
          id: { type: "string", format: "cuid", description: "ID zlecenia" },
          orderNumber: { type: "string", description: "Numer zlecenia" },
          externalNumber: { type: "string", nullable: true, description: "Zewnętrzny numer zlecenia" },
          type: { $ref: "#/components/schemas/OrderType" },
          status: { $ref: "#/components/schemas/OrderStatus" },
          contractorId: { type: "string", nullable: true, description: "ID kontrahenta" },
          contractor: { $ref: "#/components/schemas/ContractorSummary" },
          vehicleId: { type: "string", nullable: true, description: "ID pojazdu" },
          vehicle: { $ref: "#/components/schemas/VehicleSummary" },
          trailerId: { type: "string", nullable: true, description: "ID naczepy" },
          trailer: { $ref: "#/components/schemas/TrailerSummary" },
          driverId: { type: "string", nullable: true, description: "ID kierowcy" },
          driver: { $ref: "#/components/schemas/DriverSummary" },
          origin: { type: "string", description: "Miejsce załadunku" },
          originCity: { type: "string", nullable: true, description: "Miasto załadunku" },
          originCountry: { type: "string", description: "Kraj załadunku", default: "PL" },
          destination: { type: "string", description: "Miejsce rozładunku" },
          destinationCity: { type: "string", nullable: true, description: "Miasto rozładunku" },
          destinationCountry: { type: "string", description: "Kraj rozładunku", default: "PL" },
          distanceKm: { type: "number", nullable: true, description: "Dystans w km" },
          loadingDate: { type: "string", format: "date-time", description: "Data załadunku" },
          loadingTimeFrom: { type: "string", nullable: true, description: "Godzina załadunku od" },
          loadingTimeTo: { type: "string", nullable: true, description: "Godzina załadunku do" },
          unloadingDate: { type: "string", format: "date-time", description: "Data rozładunku" },
          unloadingTimeFrom: { type: "string", nullable: true, description: "Godzina rozładunku od" },
          unloadingTimeTo: { type: "string", nullable: true, description: "Godzina rozładunku do" },
          cargoDescription: { type: "string", nullable: true, description: "Opis ładunku" },
          cargoWeight: { type: "number", nullable: true, description: "Waga ładunku (kg)" },
          cargoVolume: { type: "number", nullable: true, description: "Objętość ładunku (m3)" },
          cargoPallets: { type: "integer", nullable: true, description: "Liczba palet" },
          cargoValue: { type: "number", nullable: true, description: "Wartość ładunku" },
          requiresAdr: { type: "boolean", description: "Czy wymaga ADR" },
          priceNet: { type: "number", nullable: true, description: "Cena netto" },
          currency: { type: "string", description: "Waluta", default: "PLN" },
          costNet: { type: "number", nullable: true, description: "Koszt netto (dla spedycji)" },
          notes: { type: "string", nullable: true, description: "Notatki" },
          internalNotes: { type: "string", nullable: true, description: "Notatki wewnętrzne" },
          createdAt: { type: "string", format: "date-time", description: "Data utworzenia" },
          updatedAt: { type: "string", format: "date-time", description: "Data aktualizacji" },
        },
      },
      OrderCreate: {
        type: "object",
        required: ["orderNumber", "origin", "destination", "loadingDate", "unloadingDate"],
        properties: {
          orderNumber: { type: "string", description: "Numer zlecenia" },
          externalNumber: { type: "string", description: "Zewnętrzny numer zlecenia" },
          type: { $ref: "#/components/schemas/OrderType" },
          status: { $ref: "#/components/schemas/OrderStatus" },
          contractorId: { type: "string", description: "ID kontrahenta" },
          subcontractorId: { type: "string", description: "ID podwykonawcy" },
          vehicleId: { type: "string", description: "ID pojazdu" },
          trailerId: { type: "string", description: "ID naczepy" },
          driverId: { type: "string", description: "ID kierowcy" },
          origin: { type: "string", description: "Miejsce załadunku" },
          originCity: { type: "string", description: "Miasto załadunku" },
          originCountry: { type: "string", description: "Kraj załadunku", default: "PL" },
          destination: { type: "string", description: "Miejsce rozładunku" },
          destinationCity: { type: "string", description: "Miasto rozładunku" },
          destinationCountry: { type: "string", description: "Kraj rozładunku", default: "PL" },
          distanceKm: { type: "number", description: "Dystans w km" },
          loadingDate: { type: "string", format: "date-time", description: "Data załadunku" },
          loadingTimeFrom: { type: "string", description: "Godzina załadunku od" },
          loadingTimeTo: { type: "string", description: "Godzina załadunku do" },
          unloadingDate: { type: "string", format: "date-time", description: "Data rozładunku" },
          unloadingTimeFrom: { type: "string", description: "Godzina rozładunku od" },
          unloadingTimeTo: { type: "string", description: "Godzina rozładunku do" },
          cargoDescription: { type: "string", description: "Opis ładunku" },
          cargoWeight: { type: "number", description: "Waga ładunku (kg)" },
          cargoVolume: { type: "number", description: "Objętość ładunku (m3)" },
          cargoPallets: { type: "integer", description: "Liczba palet" },
          cargoValue: { type: "number", description: "Wartość ładunku" },
          requiresAdr: { type: "boolean", description: "Czy wymaga ADR" },
          priceNet: { type: "number", description: "Cena netto" },
          currency: { type: "string", description: "Waluta", default: "PLN" },
          costNet: { type: "number", description: "Koszt netto (dla spedycji)" },
          notes: { type: "string", description: "Notatki" },
          internalNotes: { type: "string", description: "Notatki wewnętrzne" },
        },
      },
      OrderListResponse: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Order" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },

      // Vehicle schemas
      Vehicle: {
        type: "object",
        properties: {
          id: { type: "string", format: "cuid", description: "ID pojazdu" },
          registrationNumber: { type: "string", description: "Numer rejestracyjny" },
          type: { $ref: "#/components/schemas/VehicleType" },
          brand: { type: "string", nullable: true, description: "Marka" },
          model: { type: "string", nullable: true, description: "Model" },
          vin: { type: "string", nullable: true, description: "Numer VIN" },
          year: { type: "integer", nullable: true, description: "Rok produkcji" },
          status: { $ref: "#/components/schemas/VehicleStatus" },
          loadCapacity: { type: "number", nullable: true, description: "Ładowność (kg)" },
          volume: { type: "number", nullable: true, description: "Objętość (m3)" },
          euroClass: { type: "string", nullable: true, description: "Klasa Euro" },
          fuelType: { $ref: "#/components/schemas/FuelType" },
          currentDriverId: { type: "string", nullable: true, description: "ID aktualnego kierowcy" },
          currentTrailerId: { type: "string", nullable: true, description: "ID aktualnej naczepy" },
          lastLatitude: { type: "number", nullable: true, description: "Ostatnia szerokość geograficzna" },
          lastLongitude: { type: "number", nullable: true, description: "Ostatnia długość geograficzna" },
          lastGpsUpdate: { type: "string", format: "date-time", nullable: true, description: "Ostatnia aktualizacja GPS" },
          notes: { type: "string", nullable: true, description: "Notatki" },
          isActive: { type: "boolean", description: "Czy aktywny" },
          createdAt: { type: "string", format: "date-time", description: "Data utworzenia" },
          updatedAt: { type: "string", format: "date-time", description: "Data aktualizacji" },
        },
      },
      VehicleSummary: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", description: "ID pojazdu" },
          registrationNumber: { type: "string", description: "Numer rejestracyjny" },
        },
      },
      VehicleCreate: {
        type: "object",
        required: ["registrationNumber", "type"],
        properties: {
          registrationNumber: { type: "string", description: "Numer rejestracyjny" },
          type: { $ref: "#/components/schemas/VehicleType" },
          brand: { type: "string", description: "Marka" },
          model: { type: "string", description: "Model" },
          vin: { type: "string", description: "Numer VIN" },
          year: { type: "integer", description: "Rok produkcji", minimum: 1900, maximum: 2100 },
          status: { $ref: "#/components/schemas/VehicleStatus" },
          loadCapacity: { type: "number", description: "Ładowność (kg)" },
          volume: { type: "number", description: "Objętość (m3)" },
          euroClass: { type: "string", description: "Klasa Euro" },
          fuelType: { $ref: "#/components/schemas/FuelType" },
          currentDriverId: { type: "string", description: "ID aktualnego kierowcy" },
          currentTrailerId: { type: "string", description: "ID aktualnej naczepy" },
          notes: { type: "string", description: "Notatki" },
          isActive: { type: "boolean", description: "Czy aktywny", default: true },
        },
      },
      VehicleListResponse: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Vehicle" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },

      // Driver schemas
      Driver: {
        type: "object",
        properties: {
          id: { type: "string", format: "cuid", description: "ID kierowcy" },
          firstName: { type: "string", description: "Imię" },
          lastName: { type: "string", description: "Nazwisko" },
          pesel: { type: "string", nullable: true, description: "PESEL" },
          dateOfBirth: { type: "string", format: "date", nullable: true, description: "Data urodzenia" },
          phone: { type: "string", nullable: true, description: "Telefon" },
          email: { type: "string", format: "email", nullable: true, description: "Email" },
          address: { type: "string", nullable: true, description: "Adres" },
          city: { type: "string", nullable: true, description: "Miasto" },
          postalCode: { type: "string", nullable: true, description: "Kod pocztowy" },
          employmentType: { $ref: "#/components/schemas/EmploymentType" },
          employmentDate: { type: "string", format: "date", nullable: true, description: "Data zatrudnienia" },
          terminationDate: { type: "string", format: "date", nullable: true, description: "Data zakończenia" },
          currentVehicleId: { type: "string", nullable: true, description: "ID aktualnego pojazdu" },
          licenseNumber: { type: "string", nullable: true, description: "Numer prawa jazdy" },
          licenseExpiry: { type: "string", format: "date", nullable: true, description: "Ważność prawa jazdy" },
          licenseCategories: { type: "string", nullable: true, description: "Kategorie prawa jazdy" },
          adrNumber: { type: "string", nullable: true, description: "Numer ADR" },
          adrExpiry: { type: "string", format: "date", nullable: true, description: "Ważność ADR" },
          adrClasses: { type: "string", nullable: true, description: "Klasy ADR" },
          medicalExpiry: { type: "string", format: "date", nullable: true, description: "Ważność badań lekarskich" },
          status: { $ref: "#/components/schemas/DriverStatus" },
          notes: { type: "string", nullable: true, description: "Notatki" },
          isActive: { type: "boolean", description: "Czy aktywny" },
          createdAt: { type: "string", format: "date-time", description: "Data utworzenia" },
          updatedAt: { type: "string", format: "date-time", description: "Data aktualizacji" },
        },
      },
      DriverSummary: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", description: "ID kierowcy" },
          firstName: { type: "string", description: "Imię" },
          lastName: { type: "string", description: "Nazwisko" },
        },
      },
      DriverCreate: {
        type: "object",
        required: ["firstName", "lastName"],
        properties: {
          firstName: { type: "string", description: "Imię" },
          lastName: { type: "string", description: "Nazwisko" },
          pesel: { type: "string", description: "PESEL", minLength: 11, maxLength: 11 },
          dateOfBirth: { type: "string", format: "date", description: "Data urodzenia" },
          phone: { type: "string", description: "Telefon" },
          email: { type: "string", format: "email", description: "Email" },
          address: { type: "string", description: "Adres" },
          city: { type: "string", description: "Miasto" },
          postalCode: { type: "string", description: "Kod pocztowy" },
          employmentType: { $ref: "#/components/schemas/EmploymentType" },
          employmentDate: { type: "string", format: "date", description: "Data zatrudnienia" },
          currentVehicleId: { type: "string", description: "ID aktualnego pojazdu" },
          licenseNumber: { type: "string", description: "Numer prawa jazdy" },
          licenseExpiry: { type: "string", format: "date", description: "Ważność prawa jazdy" },
          licenseCategories: { type: "string", description: "Kategorie prawa jazdy" },
          adrNumber: { type: "string", description: "Numer ADR" },
          adrExpiry: { type: "string", format: "date", description: "Ważność ADR" },
          adrClasses: { type: "string", description: "Klasy ADR" },
          medicalExpiry: { type: "string", format: "date", description: "Ważność badań lekarskich" },
          status: { $ref: "#/components/schemas/DriverStatus" },
          notes: { type: "string", description: "Notatki" },
          isActive: { type: "boolean", description: "Czy aktywny", default: true },
        },
      },
      DriverListResponse: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Driver" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },

      // Contractor schemas
      Contractor: {
        type: "object",
        properties: {
          id: { type: "string", format: "cuid", description: "ID kontrahenta" },
          type: { $ref: "#/components/schemas/ContractorType" },
          name: { type: "string", description: "Nazwa" },
          shortName: { type: "string", nullable: true, description: "Nazwa skrócona" },
          nip: { type: "string", nullable: true, description: "NIP" },
          regon: { type: "string", nullable: true, description: "REGON" },
          address: { type: "string", nullable: true, description: "Adres" },
          city: { type: "string", nullable: true, description: "Miasto" },
          postalCode: { type: "string", nullable: true, description: "Kod pocztowy" },
          country: { type: "string", description: "Kraj", default: "PL" },
          phone: { type: "string", nullable: true, description: "Telefon" },
          email: { type: "string", format: "email", nullable: true, description: "Email" },
          website: { type: "string", nullable: true, description: "Strona WWW" },
          contactPerson: { type: "string", nullable: true, description: "Osoba kontaktowa" },
          contactPhone: { type: "string", nullable: true, description: "Telefon kontaktowy" },
          contactEmail: { type: "string", format: "email", nullable: true, description: "Email kontaktowy" },
          paymentDays: { type: "integer", description: "Termin płatności (dni)", default: 14 },
          creditLimit: { type: "number", nullable: true, description: "Limit kredytowy" },
          isActive: { type: "boolean", description: "Czy aktywny" },
          notes: { type: "string", nullable: true, description: "Notatki" },
          createdAt: { type: "string", format: "date-time", description: "Data utworzenia" },
          updatedAt: { type: "string", format: "date-time", description: "Data aktualizacji" },
        },
      },
      ContractorSummary: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", description: "ID kontrahenta" },
          name: { type: "string", description: "Nazwa" },
          shortName: { type: "string", nullable: true, description: "Nazwa skrócona" },
        },
      },
      ContractorCreate: {
        type: "object",
        required: ["type", "name"],
        properties: {
          type: { $ref: "#/components/schemas/ContractorType" },
          name: { type: "string", description: "Nazwa" },
          shortName: { type: "string", description: "Nazwa skrócona" },
          nip: { type: "string", description: "NIP" },
          regon: { type: "string", description: "REGON" },
          address: { type: "string", description: "Adres" },
          city: { type: "string", description: "Miasto" },
          postalCode: { type: "string", description: "Kod pocztowy" },
          country: { type: "string", description: "Kraj", default: "PL" },
          phone: { type: "string", description: "Telefon" },
          email: { type: "string", format: "email", description: "Email" },
          website: { type: "string", description: "Strona WWW" },
          contactPerson: { type: "string", description: "Osoba kontaktowa" },
          contactPhone: { type: "string", description: "Telefon kontaktowy" },
          contactEmail: { type: "string", format: "email", description: "Email kontaktowy" },
          paymentDays: { type: "integer", description: "Termin płatności (dni)", default: 14 },
          creditLimit: { type: "number", description: "Limit kredytowy" },
          notes: { type: "string", description: "Notatki" },
        },
      },
      ContractorListResponse: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Contractor" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },

      // Invoice schemas
      Invoice: {
        type: "object",
        properties: {
          id: { type: "string", format: "cuid", description: "ID faktury" },
          invoiceNumber: { type: "string", description: "Numer faktury" },
          type: { $ref: "#/components/schemas/InvoiceType" },
          status: { $ref: "#/components/schemas/InvoiceStatus" },
          contractorId: { type: "string", nullable: true, description: "ID kontrahenta" },
          contractor: { $ref: "#/components/schemas/ContractorSummary" },
          issueDate: { type: "string", format: "date-time", description: "Data wystawienia" },
          saleDate: { type: "string", format: "date-time", nullable: true, description: "Data sprzedaży" },
          dueDate: { type: "string", format: "date-time", description: "Termin płatności" },
          netAmount: { type: "number", description: "Kwota netto" },
          vatAmount: { type: "number", description: "Kwota VAT" },
          grossAmount: { type: "number", description: "Kwota brutto" },
          currency: { type: "string", description: "Waluta", default: "PLN" },
          paymentMethod: { $ref: "#/components/schemas/PaymentMethod" },
          bankAccount: { type: "string", nullable: true, description: "Numer konta bankowego" },
          isPaid: { type: "boolean", description: "Czy opłacona" },
          paidDate: { type: "string", format: "date-time", nullable: true, description: "Data zapłaty" },
          paidAmount: { type: "number", nullable: true, description: "Zapłacona kwota" },
          ksefNumber: { type: "string", nullable: true, description: "Numer KSeF" },
          ksefStatus: { type: "string", nullable: true, description: "Status KSeF" },
          notes: { type: "string", nullable: true, description: "Notatki" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/InvoiceItem" },
          },
          createdAt: { type: "string", format: "date-time", description: "Data utworzenia" },
          updatedAt: { type: "string", format: "date-time", description: "Data aktualizacji" },
        },
      },
      InvoiceItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "cuid", description: "ID pozycji" },
          description: { type: "string", description: "Opis" },
          quantity: { type: "number", description: "Ilość" },
          unit: { type: "string", description: "Jednostka", default: "szt." },
          unitPriceNet: { type: "number", description: "Cena jednostkowa netto" },
          vatRate: { type: "number", description: "Stawka VAT (%)", default: 23 },
          netAmount: { type: "number", description: "Kwota netto" },
          vatAmount: { type: "number", description: "Kwota VAT" },
          grossAmount: { type: "number", description: "Kwota brutto" },
        },
      },
      InvoiceCreate: {
        type: "object",
        required: ["contractorId", "issueDate", "dueDate", "items"],
        properties: {
          contractorId: { type: "string", description: "ID kontrahenta" },
          type: { $ref: "#/components/schemas/InvoiceType" },
          issueDate: { type: "string", format: "date-time", description: "Data wystawienia" },
          saleDate: { type: "string", format: "date-time", description: "Data sprzedaży" },
          dueDate: { type: "string", format: "date-time", description: "Termin płatności" },
          currency: { type: "string", description: "Waluta", default: "PLN" },
          paymentMethod: { $ref: "#/components/schemas/PaymentMethod" },
          bankAccount: { type: "string", description: "Numer konta bankowego" },
          notes: { type: "string", description: "Notatki" },
          orderIds: {
            type: "array",
            items: { type: "string" },
            description: "ID powiązanych zleceń",
          },
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["description", "quantity", "unitPriceNet"],
              properties: {
                description: { type: "string", description: "Opis" },
                quantity: { type: "number", description: "Ilość" },
                unit: { type: "string", description: "Jednostka", default: "szt." },
                unitPriceNet: { type: "number", description: "Cena jednostkowa netto" },
                vatRate: { type: "number", description: "Stawka VAT (%)", default: 23 },
              },
            },
          },
        },
      },
      InvoiceListResponse: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Invoice" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },

      // Trailer schemas
      TrailerSummary: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", description: "ID naczepy" },
          registrationNumber: { type: "string", description: "Numer rejestracyjny" },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Brak autoryzacji - użytkownik nie jest zalogowany",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Nieautoryzowany" },
          },
        },
      },
      ForbiddenError: {
        description: "Brak uprawnień do wykonania operacji",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Brak przypisanego tenanta" },
          },
        },
      },
      NotFoundError: {
        description: "Zasób nie został znaleziony",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Zasób nie został znaleziony" },
          },
        },
      },
      ValidationError: {
        description: "Błąd walidacji danych wejściowych",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              error: "Nieprawidłowe dane",
              details: {
                fieldErrors: { orderNumber: ["Pole jest wymagane"] },
              },
            },
          },
        },
      },
      ConflictError: {
        description: "Konflikt - zasób już istnieje",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Zasób o podanych danych już istnieje" },
          },
        },
      },
      InternalServerError: {
        description: "Wewnętrzny błąd serwera",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: "Wystąpił błąd podczas przetwarzania żądania" },
          },
        },
      },
    },
  },
  security: [{ sessionAuth: [] }],
  paths: {
    // Orders endpoints
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "Lista zleceń",
        description: "Pobiera listę zleceń z możliwością filtrowania i paginacji",
        operationId: "listOrders",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Numer strony" },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 }, description: "Limit wyników" },
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/OrderStatus" }, description: "Filtr statusu" },
          { name: "driverId", in: "query", schema: { type: "string" }, description: "ID kierowcy" },
          { name: "vehicleId", in: "query", schema: { type: "string" }, description: "ID pojazdu" },
          { name: "contractorId", in: "query", schema: { type: "string" }, description: "ID kontrahenta" },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" }, description: "Data załadunku od" },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" }, description: "Data załadunku do" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Szukaj (numer, miasto, opis)" },
          { name: "sortBy", in: "query", schema: { type: "string", default: "loadingDate" }, description: "Pole sortowania" },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" }, description: "Kierunek sortowania" },
        ],
        responses: {
          "200": {
            description: "Lista zleceń",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OrderListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Utwórz zlecenie",
        description: "Tworzy nowe zlecenie transportowe",
        operationId: "createOrder",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Zlecenie utworzone",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "409": { $ref: "#/components/responses/ConflictError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Pobierz zlecenie",
        description: "Pobiera szczegóły pojedynczego zlecenia",
        operationId: "getOrder",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID zlecenia" },
        ],
        responses: {
          "200": {
            description: "Szczegóły zlecenia",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      put: {
        tags: ["Orders"],
        summary: "Aktualizuj zlecenie",
        description: "Aktualizuje wszystkie dane zlecenia",
        operationId: "updateOrder",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID zlecenia" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderCreate" },
            },
          },
        },
        responses: {
          "200": {
            description: "Zlecenie zaktualizowane",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "409": { $ref: "#/components/responses/ConflictError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      patch: {
        tags: ["Orders"],
        summary: "Częściowa aktualizacja zlecenia",
        description: "Aktualizuje wybrane pola zlecenia (status, przypisania)",
        operationId: "patchOrder",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID zlecenia" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { $ref: "#/components/schemas/OrderStatus" },
                  driverId: { type: "string", nullable: true },
                  vehicleId: { type: "string", nullable: true },
                  trailerId: { type: "string", nullable: true },
                  notes: { type: "string" },
                  internalNotes: { type: "string" },
                  priceNet: { type: "number" },
                  costNet: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Zlecenie zaktualizowane",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Orders"],
        summary: "Usuń zlecenie",
        description: "Usuwa zlecenie (nie można usunąć zlecenia powiązanego z fakturą)",
        operationId: "deleteOrder",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID zlecenia" },
        ],
        responses: {
          "200": {
            description: "Zlecenie usunięte",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Zlecenie zostało usunięte" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // Invoices endpoints
    "/invoices": {
      get: {
        tags: ["Invoices"],
        summary: "Lista faktur",
        description: "Pobiera listę faktur z możliwością filtrowania i paginacji",
        operationId: "listInvoices",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Numer strony" },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 }, description: "Limit wyników" },
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/InvoiceStatus" }, description: "Filtr statusu" },
          { name: "contractorId", in: "query", schema: { type: "string" }, description: "ID kontrahenta" },
          { name: "startDate", in: "query", schema: { type: "string", format: "date" }, description: "Data wystawienia od" },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" }, description: "Data wystawienia do" },
        ],
        responses: {
          "200": {
            description: "Lista faktur",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InvoiceListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Invoices"],
        summary: "Utwórz fakturę",
        description: "Tworzy nową fakturę. Numer faktury jest generowany automatycznie.",
        operationId: "createInvoice",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InvoiceCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Faktura utworzona",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Invoice" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/invoices/{id}": {
      get: {
        tags: ["Invoices"],
        summary: "Pobierz fakturę",
        description: "Pobiera szczegóły pojedynczej faktury",
        operationId: "getInvoice",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID faktury" },
        ],
        responses: {
          "200": {
            description: "Szczegóły faktury",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Invoice" },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      put: {
        tags: ["Invoices"],
        summary: "Aktualizuj fakturę",
        description: "Aktualizuje fakturę (tylko wersje robocze)",
        operationId: "updateInvoice",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID faktury" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InvoiceCreate" },
            },
          },
        },
        responses: {
          "200": {
            description: "Faktura zaktualizowana",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Invoice" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      patch: {
        tags: ["Invoices"],
        summary: "Aktualizuj status faktury",
        description: "Aktualizuje status faktury lub oznacza jako opłaconą",
        operationId: "patchInvoice",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID faktury" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { $ref: "#/components/schemas/InvoiceStatus" },
                  isPaid: { type: "boolean" },
                  paidDate: { type: "string", format: "date-time" },
                  paidAmount: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Faktura zaktualizowana",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Invoice" },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Invoices"],
        summary: "Usuń fakturę",
        description: "Usuwa fakturę (tylko wersje robocze)",
        operationId: "deleteInvoice",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID faktury" },
        ],
        responses: {
          "200": {
            description: "Faktura usunięta",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // Vehicles endpoints
    "/vehicles": {
      get: {
        tags: ["Vehicles"],
        summary: "Lista pojazdów",
        description: "Pobiera listę pojazdów z możliwością filtrowania i paginacji",
        operationId: "listVehicles",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Numer strony" },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 }, description: "Limit wyników" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Szukaj (rejestracja, marka, model, VIN)" },
          { name: "type", in: "query", schema: { $ref: "#/components/schemas/VehicleType" }, description: "Typ pojazdu" },
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/VehicleStatus" }, description: "Status" },
          { name: "isActive", in: "query", schema: { type: "boolean" }, description: "Czy aktywny" },
          { name: "sortBy", in: "query", schema: { type: "string", default: "createdAt" }, description: "Pole sortowania" },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" }, description: "Kierunek sortowania" },
        ],
        responses: {
          "200": {
            description: "Lista pojazdów",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleListResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Vehicles"],
        summary: "Utwórz pojazd",
        description: "Tworzy nowy pojazd. Wymaga roli ADMIN, MANAGER lub wyższej.",
        operationId: "createVehicle",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VehicleCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Pojazd utworzony",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Vehicle" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "409": { $ref: "#/components/responses/ConflictError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/vehicles/{id}": {
      get: {
        tags: ["Vehicles"],
        summary: "Pobierz pojazd",
        description: "Pobiera szczegóły pojazdu wraz z ostatnimi zleceniami, kosztami i dokumentami",
        operationId: "getVehicle",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID pojazdu" },
        ],
        responses: {
          "200": {
            description: "Szczegóły pojazdu",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Vehicle" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      put: {
        tags: ["Vehicles"],
        summary: "Aktualizuj pojazd",
        description: "Aktualizuje dane pojazdu. Wymaga roli ADMIN, MANAGER lub wyższej.",
        operationId: "updateVehicle",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID pojazdu" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VehicleCreate" },
            },
          },
        },
        responses: {
          "200": {
            description: "Pojazd zaktualizowany",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Vehicle" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "409": { $ref: "#/components/responses/ConflictError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Vehicles"],
        summary: "Dezaktywuj pojazd",
        description: "Dezaktywuje pojazd (soft delete). Wymaga roli ADMIN lub wyższej. Nie można dezaktywować pojazdu z aktywnymi zleceniami.",
        operationId: "deleteVehicle",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID pojazdu" },
        ],
        responses: {
          "200": {
            description: "Pojazd dezaktywowany",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Vehicle" },
                    message: { type: "string", example: "Pojazd został dezaktywowany" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "409": { $ref: "#/components/responses/ConflictError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // Drivers endpoints
    "/drivers": {
      get: {
        tags: ["Drivers"],
        summary: "Lista kierowców",
        description: "Pobiera listę kierowców z możliwością filtrowania i paginacji",
        operationId: "listDrivers",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Numer strony" },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 }, description: "Limit wyników" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Szukaj (imię, nazwisko, email, telefon)" },
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/DriverStatus" }, description: "Status" },
          { name: "employmentType", in: "query", schema: { $ref: "#/components/schemas/EmploymentType" }, description: "Typ zatrudnienia" },
          { name: "isActive", in: "query", schema: { type: "boolean" }, description: "Czy aktywny" },
          { name: "hasExpiringDocuments", in: "query", schema: { type: "boolean" }, description: "Ma wygasające dokumenty (30 dni)" },
          { name: "sortBy", in: "query", schema: { type: "string", default: "lastName" }, description: "Pole sortowania" },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "asc" }, description: "Kierunek sortowania" },
        ],
        responses: {
          "200": {
            description: "Lista kierowców",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DriverListResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Drivers"],
        summary: "Utwórz kierowcę",
        description: "Tworzy nowego kierowcę. Wymaga roli ADMIN, MANAGER lub wyższej.",
        operationId: "createDriver",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DriverCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Kierowca utworzony",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Driver" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "409": { $ref: "#/components/responses/ConflictError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/drivers/{id}": {
      get: {
        tags: ["Drivers"],
        summary: "Pobierz kierowcę",
        description: "Pobiera szczegóły kierowcy wraz z ostatnimi zleceniami, kosztami, dokumentami i raportami miesięcznymi",
        operationId: "getDriver",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID kierowcy" },
        ],
        responses: {
          "200": {
            description: "Szczegóły kierowcy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Driver" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      put: {
        tags: ["Drivers"],
        summary: "Aktualizuj kierowcę",
        description: "Aktualizuje dane kierowcy. Wymaga roli ADMIN, MANAGER lub wyższej.",
        operationId: "updateDriver",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID kierowcy" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DriverCreate" },
            },
          },
        },
        responses: {
          "200": {
            description: "Kierowca zaktualizowany",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Driver" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "409": { $ref: "#/components/responses/ConflictError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Drivers"],
        summary: "Dezaktywuj kierowcę",
        description: "Dezaktywuje kierowcę (soft delete). Wymaga roli ADMIN lub wyższej. Nie można dezaktywować kierowcy z aktywnymi zleceniami.",
        operationId: "deleteDriver",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID kierowcy" },
        ],
        responses: {
          "200": {
            description: "Kierowca dezaktywowany",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Driver" },
                    message: { type: "string", example: "Kierowca został dezaktywowany" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "409": { $ref: "#/components/responses/ConflictError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },

    // Contractors endpoints
    "/contractors": {
      get: {
        tags: ["Contractors"],
        summary: "Lista kontrahentów",
        description: "Pobiera listę kontrahentów z możliwością filtrowania i paginacji",
        operationId: "listContractors",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Numer strony" },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 }, description: "Limit wyników" },
          { name: "type", in: "query", schema: { $ref: "#/components/schemas/ContractorType" }, description: "Typ kontrahenta" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Szukaj (nazwa, NIP)" },
        ],
        responses: {
          "200": {
            description: "Lista kontrahentów",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ContractorListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      post: {
        tags: ["Contractors"],
        summary: "Utwórz kontrahenta",
        description: "Tworzy nowego kontrahenta (klienta lub przewoźnika)",
        operationId: "createContractor",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ContractorCreate" },
            },
          },
        },
        responses: {
          "201": {
            description: "Kontrahent utworzony",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Contractor" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/contractors/{id}": {
      get: {
        tags: ["Contractors"],
        summary: "Pobierz kontrahenta",
        description: "Pobiera szczegóły kontrahenta wraz z ostatnimi zleceniami i fakturami",
        operationId: "getContractor",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID kontrahenta" },
        ],
        responses: {
          "200": {
            description: "Szczegóły kontrahenta",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Contractor" },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      put: {
        tags: ["Contractors"],
        summary: "Aktualizuj kontrahenta",
        description: "Aktualizuje dane kontrahenta",
        operationId: "updateContractor",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID kontrahenta" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ContractorCreate" },
            },
          },
        },
        responses: {
          "200": {
            description: "Kontrahent zaktualizowany",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Contractor" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Contractors"],
        summary: "Dezaktywuj kontrahenta",
        description: "Dezaktywuje kontrahenta (soft delete)",
        operationId: "deleteContractor",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID kontrahenta" },
        ],
        responses: {
          "200": {
            description: "Kontrahent dezaktywowany",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
  },
};
