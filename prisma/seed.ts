import {
  PrismaClient,
  VehicleType,
  VehicleStatus,
  FuelType,
  TrailerType,
  UserRole,
  DriverStatus,
  EmploymentType,
  ContractorType,
  OrderType,
  OrderStatus,
  CostCategory,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create or get tenant
  let tenant = await prisma.tenant.findFirst({
    where: { name: "Demo Firma Transportowa" },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Demo Firma Transportowa",
        slug: "demo-transport",
        nip: "1234567890",
        address: "ul. Transportowa 1",
        city: "Warszawa",
        postalCode: "00-001",
        country: "PL",
        phone: "+48 123 456 789",
        email: "kontakt@demo-transport.pl",
      },
    });
    console.log("✅ Created tenant:", tenant.name);
  }

  // Create admin user if not exists
  const adminEmail = "admin@demo.pl";
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: "Administrator",
        role: UserRole.ADMIN,
        tenantId: tenant.id,
        isActive: true,
      },
    });
    console.log("✅ Created admin user:", adminEmail);
  }

  // ==================== VEHICLES (10) ====================
  const vehiclesData = [
    {
      registrationNumber: "WGM1068L",
      type: VehicleType.TRUCK,
      brand: "MAN",
      model: "TGX 18.480",
      year: 2021,
      status: VehicleStatus.ACTIVE,
      fuelType: FuelType.DIESEL,
      loadCapacity: 24000,
      euroClass: "Euro 6",
    },
    {
      registrationNumber: "DSR50038",
      type: VehicleType.TRUCK,
      brand: "Volvo",
      model: "FH 500",
      year: 2022,
      status: VehicleStatus.ACTIVE,
      fuelType: FuelType.DIESEL,
      loadCapacity: 24000,
      euroClass: "Euro 6",
    },
    {
      registrationNumber: "PZ057XE",
      type: VehicleType.TRUCK,
      brand: "Scania",
      model: "R 450",
      year: 2020,
      status: VehicleStatus.IN_SERVICE,
      fuelType: FuelType.DIESEL,
      loadCapacity: 24000,
      euroClass: "Euro 6",
    },
    {
      registrationNumber: "DSWNS47",
      type: VehicleType.TRUCK,
      brand: "DAF",
      model: "XF 480",
      year: 2023,
      status: VehicleStatus.ACTIVE,
      fuelType: FuelType.DIESEL,
      loadCapacity: 24000,
      euroClass: "Euro 6",
    },
    {
      registrationNumber: "WI8834K",
      type: VehicleType.TRUCK,
      brand: "Mercedes-Benz",
      model: "Actros 1845",
      year: 2019,
      status: VehicleStatus.INACTIVE,
      fuelType: FuelType.DIESEL,
      loadCapacity: 24000,
      euroClass: "Euro 6",
    },
    {
      registrationNumber: "KR7712M",
      type: VehicleType.TRUCK,
      brand: "Iveco",
      model: "S-Way 480",
      year: 2022,
      status: VehicleStatus.ACTIVE,
      fuelType: FuelType.DIESEL,
      loadCapacity: 24000,
      euroClass: "Euro 6",
    },
    {
      registrationNumber: "GD2244N",
      type: VehicleType.TRUCK,
      brand: "Renault",
      model: "T High 520",
      year: 2021,
      status: VehicleStatus.ACTIVE,
      fuelType: FuelType.DIESEL,
      loadCapacity: 24000,
      euroClass: "Euro 6",
    },
    {
      registrationNumber: "PO9988X",
      type: VehicleType.TRUCK,
      brand: "MAN",
      model: "TGX 18.510",
      year: 2023,
      status: VehicleStatus.ACTIVE,
      fuelType: FuelType.DIESEL,
      loadCapacity: 24000,
      euroClass: "Euro 6",
    },
    {
      registrationNumber: "WR5566Y",
      type: VehicleType.TRUCK,
      brand: "Volvo",
      model: "FH 460",
      year: 2020,
      status: VehicleStatus.IN_SERVICE,
      fuelType: FuelType.DIESEL,
      loadCapacity: 24000,
      euroClass: "Euro 6",
    },
    {
      registrationNumber: "LU3344Z",
      type: VehicleType.TRUCK,
      brand: "Scania",
      model: "S 500",
      year: 2022,
      status: VehicleStatus.ACTIVE,
      fuelType: FuelType.DIESEL,
      loadCapacity: 24000,
      euroClass: "Euro 6",
    },
  ];

  for (const vehicleData of vehiclesData) {
    const existing = await prisma.vehicle.findFirst({
      where: {
        tenantId: tenant.id,
        registrationNumber: vehicleData.registrationNumber,
      },
    });

    if (!existing) {
      await prisma.vehicle.create({
        data: {
          ...vehicleData,
          tenantId: tenant.id,
        },
      });
      console.log("✅ Created vehicle:", vehicleData.registrationNumber);
    }
  }

  // ==================== TRAILERS (10) ====================
  const trailersData = [
    {
      registrationNumber: "WGM2001",
      type: TrailerType.CURTAIN,
      brand: "Krone",
      year: 2021,
      status: VehicleStatus.ACTIVE,
      loadCapacity: 24000,
      volume: 92,
      axles: 3,
    },
    {
      registrationNumber: "DSR3002",
      type: TrailerType.REFRIGERATOR,
      brand: "Schmitz",
      year: 2022,
      status: VehicleStatus.ACTIVE,
      loadCapacity: 22000,
      volume: 86,
      axles: 3,
    },
    {
      registrationNumber: "PZ4003",
      type: TrailerType.MEGA,
      brand: "Wielton",
      year: 2020,
      status: VehicleStatus.ACTIVE,
      loadCapacity: 24000,
      volume: 100,
      axles: 3,
    },
    {
      registrationNumber: "KR5004",
      type: TrailerType.CURTAIN,
      brand: "Krone",
      year: 2019,
      status: VehicleStatus.IN_SERVICE,
      loadCapacity: 24000,
      volume: 92,
      axles: 3,
    },
    {
      registrationNumber: "GD6005",
      type: TrailerType.CURTAIN,
      brand: "Schmitz",
      year: 2021,
      status: VehicleStatus.ACTIVE,
      loadCapacity: 24000,
      volume: 92,
      axles: 3,
    },
    {
      registrationNumber: "PO7006",
      type: TrailerType.REFRIGERATOR,
      brand: "Krone",
      year: 2023,
      status: VehicleStatus.ACTIVE,
      loadCapacity: 22000,
      volume: 88,
      axles: 3,
    },
    {
      registrationNumber: "WR8007",
      type: TrailerType.MEGA,
      brand: "Kogel",
      year: 2022,
      status: VehicleStatus.ACTIVE,
      loadCapacity: 24000,
      volume: 100,
      axles: 3,
    },
    {
      registrationNumber: "LU9008",
      type: TrailerType.FLATBED,
      brand: "Wielton",
      year: 2020,
      status: VehicleStatus.ACTIVE,
      loadCapacity: 26000,
      volume: 0,
      axles: 3,
    },
    {
      registrationNumber: "WA1009",
      type: TrailerType.BOX,
      brand: "Schmitz",
      year: 2021,
      status: VehicleStatus.INACTIVE,
      loadCapacity: 24000,
      volume: 90,
      axles: 3,
    },
    {
      registrationNumber: "KA2010",
      type: TrailerType.CURTAIN,
      brand: "Krone",
      year: 2022,
      status: VehicleStatus.ACTIVE,
      loadCapacity: 24000,
      volume: 92,
      axles: 3,
    },
  ];

  for (const trailerData of trailersData) {
    const existing = await prisma.trailer.findFirst({
      where: {
        tenantId: tenant.id,
        registrationNumber: trailerData.registrationNumber,
      },
    });

    if (!existing) {
      await prisma.trailer.create({
        data: {
          ...trailerData,
          tenantId: tenant.id,
        },
      });
      console.log("✅ Created trailer:", trailerData.registrationNumber);
    }
  }

  // ==================== DRIVERS (10) ====================
  const driversData = [
    {
      firstName: "Jan",
      lastName: "Kowalski",
      email: "jan.kowalski@demo.pl",
      phone: "+48 600 100 001",
      pesel: "85010112345",
      employmentType: EmploymentType.EMPLOYMENT,
      employmentDate: new Date("2019-04-01"),
      licenseNumber: "ABC123456",
      licenseCategories: "C, C+E",
      licenseExpiry: new Date("2028-06-15"),
      medicalExpiry: new Date("2026-03-20"),
      city: "Warszawa",
      status: DriverStatus.ACTIVE,
    },
    {
      firstName: "Piotr",
      lastName: "Nowak",
      email: "piotr.nowak@demo.pl",
      phone: "+48 600 100 002",
      pesel: "88050523456",
      employmentType: EmploymentType.EMPLOYMENT,
      employmentDate: new Date("2020-08-15"),
      licenseNumber: "DEF789012",
      licenseCategories: "C, C+E",
      licenseExpiry: new Date("2027-09-10"),
      medicalExpiry: new Date("2026-05-15"),
      city: "Wroclaw",
      status: DriverStatus.ACTIVE,
    },
    {
      firstName: "Adam",
      lastName: "Wisniewski",
      email: "adam.wisniewski@demo.pl",
      phone: "+48 600 100 003",
      pesel: "90030334567",
      employmentType: EmploymentType.B2B,
      employmentDate: new Date("2018-01-10"),
      licenseNumber: "GHI345678",
      licenseCategories: "C, C+E",
      licenseExpiry: new Date("2026-01-25"),
      medicalExpiry: new Date("2026-08-10"),
      city: "Lodz",
      status: DriverStatus.ACTIVE,
    },
    {
      firstName: "Tomasz",
      lastName: "Mazur",
      email: "tomasz.mazur@demo.pl",
      phone: "+48 600 100 004",
      pesel: "92070745678",
      employmentType: EmploymentType.CONTRACT,
      employmentDate: new Date("2021-03-20"),
      licenseNumber: "JKL901234",
      licenseCategories: "C, C+E",
      licenseExpiry: new Date("2029-03-05"),
      medicalExpiry: new Date("2027-01-15"),
      city: "Gdansk",
      status: DriverStatus.ACTIVE,
    },
    {
      firstName: "Michal",
      lastName: "Zielinski",
      email: "michal.zielinski@demo.pl",
      phone: "+48 600 100 005",
      pesel: "87090956789",
      employmentType: EmploymentType.EMPLOYMENT,
      employmentDate: new Date("2020-02-15"),
      licenseNumber: "MNO567890",
      licenseCategories: "C, C+E",
      licenseExpiry: new Date("2027-07-20"),
      medicalExpiry: new Date("2026-11-30"),
      city: "Poznan",
      status: DriverStatus.ON_LEAVE,
    },
    {
      firstName: "Krzysztof",
      lastName: "Lewandowski",
      email: "krzysztof.lewandowski@demo.pl",
      phone: "+48 600 100 006",
      pesel: "83111167890",
      employmentType: EmploymentType.EMPLOYMENT,
      employmentDate: new Date("2019-09-01"),
      licenseNumber: "PQR234567",
      licenseCategories: "C, C+E",
      licenseExpiry: new Date("2028-12-10"),
      medicalExpiry: new Date("2026-04-25"),
      city: "Krakow",
      status: DriverStatus.SICK,
    },
    {
      firstName: "Andrzej",
      lastName: "Wojcik",
      email: "andrzej.wojcik@demo.pl",
      phone: "+48 600 100 007",
      pesel: "79050578901",
      employmentType: EmploymentType.EMPLOYMENT,
      employmentDate: new Date("2017-05-20"),
      licenseNumber: "STU890123",
      licenseCategories: "C, C+E",
      licenseExpiry: new Date("2026-11-15"),
      medicalExpiry: new Date("2026-08-20"),
      city: "Szczecin",
      status: DriverStatus.ACTIVE,
    },
    {
      firstName: "Marek",
      lastName: "Kaminski",
      email: "marek.kaminski@demo.pl",
      phone: "+48 600 100 008",
      pesel: "81080889012",
      employmentType: EmploymentType.B2B,
      employmentDate: new Date("2022-01-10"),
      licenseNumber: "VWX456789",
      licenseCategories: "C, C+E",
      licenseExpiry: new Date("2029-02-28"),
      medicalExpiry: new Date("2027-06-15"),
      city: "Bydgoszcz",
      status: DriverStatus.ACTIVE,
    },
    {
      firstName: "Rafal",
      lastName: "Kaczmarek",
      email: "rafal.kaczmarek@demo.pl",
      phone: "+48 600 100 009",
      pesel: "86060690123",
      employmentType: EmploymentType.EMPLOYMENT,
      employmentDate: new Date("2020-06-01"),
      licenseNumber: "YZA012345",
      licenseCategories: "C, C+E",
      licenseExpiry: new Date("2028-04-10"),
      medicalExpiry: new Date("2026-09-05"),
      city: "Lublin",
      status: DriverStatus.ACTIVE,
    },
    {
      firstName: "Pawel",
      lastName: "Grabowski",
      email: "pawel.grabowski@demo.pl",
      phone: "+48 600 100 010",
      pesel: "84040401234",
      employmentType: EmploymentType.CONTRACT,
      employmentDate: new Date("2021-09-15"),
      licenseNumber: "BCD678901",
      licenseCategories: "C, C+E",
      licenseExpiry: new Date("2027-08-20"),
      medicalExpiry: new Date("2026-12-10"),
      city: "Katowice",
      status: DriverStatus.ACTIVE,
    },
  ];

  for (const driverData of driversData) {
    const existing = await prisma.driver.findFirst({
      where: {
        tenantId: tenant.id,
        email: driverData.email,
      },
    });

    if (!existing) {
      await prisma.driver.create({
        data: {
          ...driverData,
          tenantId: tenant.id,
          isActive: true,
        },
      });
      console.log("✅ Created driver:", `${driverData.firstName} ${driverData.lastName}`);
    }
  }

  // ==================== CONTRACTORS (10) ====================
  const contractorsData = [
    {
      name: "Rhenus Logistics",
      shortName: "RHENUS",
      nip: "5260300338",
      type: ContractorType.CLIENT,
      email: "kontakt@rhenus.pl",
      phone: "+48 22 123 45 67",
      address: "ul. Logistyczna 10",
      city: "Warszawa",
      postalCode: "02-234",
      country: "PL",
    },
    {
      name: "DHL Freight",
      shortName: "DHL",
      nip: "5270103391",
      type: ContractorType.CLIENT,
      email: "spedycja@dhl.pl",
      phone: "+48 22 234 56 78",
      address: "ul. Transportowa 5",
      city: "Poznan",
      postalCode: "60-001",
      country: "PL",
    },
    {
      name: "DB Schenker",
      shortName: "SCHENKER",
      nip: "5261009068",
      type: ContractorType.CLIENT,
      email: "zlecenia@dbschenker.pl",
      phone: "+48 22 345 67 89",
      address: "ul. Spedycyjna 15",
      city: "Wroclaw",
      postalCode: "50-002",
      country: "PL",
    },
    {
      name: "Kuehne + Nagel",
      shortName: "K+N",
      nip: "5260206439",
      type: ContractorType.CLIENT,
      email: "transport@kuehne-nagel.pl",
      phone: "+48 22 456 78 90",
      address: "ul. Morska 20",
      city: "Gdansk",
      postalCode: "80-003",
      country: "PL",
    },
    {
      name: "GEFCO Polska",
      shortName: "GEFCO",
      nip: "5260203987",
      type: ContractorType.CLIENT,
      email: "zlecenia@gefco.pl",
      phone: "+48 22 567 89 01",
      address: "ul. Przemyslowa 8",
      city: "Lodz",
      postalCode: "90-004",
      country: "PL",
    },
    {
      name: "Trans Europa",
      shortName: "TE",
      nip: "6340127654",
      type: ContractorType.CARRIER,
      email: "biuro@transeuropa.pl",
      phone: "+48 32 678 90 12",
      address: "ul. Przewoznikow 12",
      city: "Katowice",
      postalCode: "40-005",
      country: "PL",
    },
    {
      name: "Speed Logistics",
      shortName: "SPEED",
      nip: "7250012345",
      type: ContractorType.CARRIER,
      email: "dyspozycja@speedlog.pl",
      phone: "+48 42 789 01 23",
      address: "ul. Szybka 25",
      city: "Lodz",
      postalCode: "91-006",
      country: "PL",
    },
    {
      name: "Polska Logistyka Sp. z o.o.",
      shortName: "POLLOG",
      nip: "8510023456",
      type: ContractorType.BOTH,
      email: "kontakt@pollog.pl",
      phone: "+48 91 890 12 34",
      address: "ul. Portowa 30",
      city: "Szczecin",
      postalCode: "70-007",
      country: "PL",
    },
    {
      name: "Mega Trans",
      shortName: "MEGA",
      nip: "9560034567",
      type: ContractorType.CLIENT,
      email: "zamowienia@megatrans.pl",
      phone: "+48 52 901 23 45",
      address: "ul. Wielka 18",
      city: "Bydgoszcz",
      postalCode: "85-008",
      country: "PL",
    },
    {
      name: "Raben Group",
      shortName: "RABEN",
      nip: "7820000123",
      type: ContractorType.CLIENT,
      email: "zlecenia@raben-group.pl",
      phone: "+48 61 012 34 56",
      address: "ul. Logistyczna 1",
      city: "Gadki",
      postalCode: "62-023",
      country: "PL",
    },
  ];

  for (const contractorData of contractorsData) {
    const existing = await prisma.contractor.findFirst({
      where: {
        tenantId: tenant.id,
        nip: contractorData.nip,
      },
    });

    if (!existing) {
      await prisma.contractor.create({
        data: {
          ...contractorData,
          tenantId: tenant.id,
          isActive: true,
        },
      });
      console.log("✅ Created contractor:", contractorData.name);
    }
  }

  // Fetch created data for orders
  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId: tenant.id },
    take: 10,
  });
  const trailers = await prisma.trailer.findMany({
    where: { tenantId: tenant.id },
    take: 10,
  });
  const drivers = await prisma.driver.findMany({
    where: { tenantId: tenant.id },
    take: 10,
  });
  const contractors = await prisma.contractor.findMany({
    where: { tenantId: tenant.id, type: { in: [ContractorType.CLIENT, ContractorType.BOTH] } },
    take: 10,
  });

  // ==================== ORDERS (10) ====================
  const ordersData = [
    {
      orderNumber: "ZLC/2026/01/001",
      type: OrderType.OWN,
      status: OrderStatus.COMPLETED,
      origin: "Warszawa, Polska",
      destination: "Berlin, Niemcy",
      loadingDate: new Date("2026-01-05"),
      unloadingDate: new Date("2026-01-06"),
      priceNet: 2500.0,
      currency: "EUR",
      cargoDescription: "Palety z elektroniką",
      cargoWeight: 18000,
    },
    {
      orderNumber: "ZLC/2026/01/002",
      type: OrderType.OWN,
      status: OrderStatus.COMPLETED,
      origin: "Wrocław, Polska",
      destination: "Praga, Czechy",
      loadingDate: new Date("2026-01-07"),
      unloadingDate: new Date("2026-01-08"),
      priceNet: 1800.0,
      currency: "EUR",
      cargoDescription: "Części samochodowe",
      cargoWeight: 20000,
    },
    {
      orderNumber: "ZLC/2026/01/003",
      type: OrderType.FORWARDING,
      status: OrderStatus.IN_TRANSIT,
      origin: "Gdańsk, Polska",
      destination: "Hamburg, Niemcy",
      loadingDate: new Date("2026-01-15"),
      unloadingDate: new Date("2026-01-16"),
      priceNet: 3200.0,
      currency: "EUR",
      cargoDescription: "Kontener morski",
      cargoWeight: 22000,
    },
    {
      orderNumber: "ZLC/2026/01/004",
      type: OrderType.OWN,
      status: OrderStatus.LOADING,
      origin: "Poznań, Polska",
      destination: "Amsterdam, Holandia",
      loadingDate: new Date("2026-01-17"),
      unloadingDate: new Date("2026-01-18"),
      priceNet: 2800.0,
      currency: "EUR",
      cargoDescription: "Meble",
      cargoWeight: 16000,
    },
    {
      orderNumber: "ZLC/2026/01/005",
      type: OrderType.OWN,
      status: OrderStatus.ASSIGNED,
      origin: "Kraków, Polska",
      destination: "Wiedeń, Austria",
      loadingDate: new Date("2026-01-18"),
      unloadingDate: new Date("2026-01-19"),
      priceNet: 2100.0,
      currency: "EUR",
      cargoDescription: "Artykuły spożywcze",
      cargoWeight: 19000,
    },
    {
      orderNumber: "ZLC/2026/01/006",
      type: OrderType.OWN,
      status: OrderStatus.PLANNED,
      origin: "Łódź, Polska",
      destination: "Paryż, Francja",
      loadingDate: new Date("2026-01-20"),
      unloadingDate: new Date("2026-01-22"),
      priceNet: 4500.0,
      currency: "EUR",
      cargoDescription: "Tekstylia",
      cargoWeight: 15000,
    },
    {
      orderNumber: "ZLC/2026/01/007",
      type: OrderType.FORWARDING,
      status: OrderStatus.PLANNED,
      origin: "Katowice, Polska",
      destination: "Mediolan, Włochy",
      loadingDate: new Date("2026-01-21"),
      unloadingDate: new Date("2026-01-23"),
      priceNet: 3800.0,
      currency: "EUR",
      cargoDescription: "Maszyny przemysłowe",
      cargoWeight: 24000,
    },
    {
      orderNumber: "ZLC/2026/01/008",
      type: OrderType.OWN,
      status: OrderStatus.CONFIRMED,
      origin: "Szczecin, Polska",
      destination: "Kopenhaga, Dania",
      loadingDate: new Date("2026-01-19"),
      unloadingDate: new Date("2026-01-20"),
      priceNet: 2900.0,
      currency: "EUR",
      cargoDescription: "Chemikalia (ADR)",
      cargoWeight: 17000,
    },
    {
      orderNumber: "ZLC/2026/01/009",
      type: OrderType.OWN,
      status: OrderStatus.DELIVERED,
      origin: "Bydgoszcz, Polska",
      destination: "Monachium, Niemcy",
      loadingDate: new Date("2026-01-12"),
      unloadingDate: new Date("2026-01-13"),
      priceNet: 2600.0,
      currency: "EUR",
      cargoDescription: "Elektronika",
      cargoWeight: 18500,
    },
    {
      orderNumber: "ZLC/2026/01/010",
      type: OrderType.OWN,
      status: OrderStatus.NEW,
      origin: "Lublin, Polska",
      destination: "Bratysława, Słowacja",
      loadingDate: new Date("2026-01-22"),
      unloadingDate: new Date("2026-01-23"),
      priceNet: 1500.0,
      currency: "EUR",
      cargoDescription: "Materiały budowlane",
      cargoWeight: 23000,
    },
  ];

  for (let i = 0; i < ordersData.length; i++) {
    const orderData = ordersData[i];
    const existing = await prisma.order.findFirst({
      where: {
        tenantId: tenant.id,
        orderNumber: orderData.orderNumber,
      },
    });

    if (!existing) {
      await prisma.order.create({
        data: {
          ...orderData,
          tenantId: tenant.id,
          vehicleId: vehicles[i % vehicles.length]?.id,
          trailerId: trailers[i % trailers.length]?.id,
          driverId: drivers[i % drivers.length]?.id,
          contractorId: contractors[i % contractors.length]?.id,
        },
      });
      console.log("✅ Created order:", orderData.orderNumber);
    }
  }

  // ==================== COSTS (10) ====================
  const costsData = [
    {
      category: CostCategory.FUEL,
      description: "Tankowanie - Shell Warszawa",
      amount: 2500.0,
      currency: "PLN",
      date: new Date("2026-01-10"),
    },
    {
      category: CostCategory.TOLL,
      description: "Opłaty drogowe - viatoll styczeń",
      amount: 1800.0,
      currency: "PLN",
      date: new Date("2026-01-15"),
    },
    {
      category: CostCategory.SERVICE,
      description: "Wymiana opon - MAN WGM1068L",
      amount: 4500.0,
      currency: "PLN",
      date: new Date("2026-01-08"),
    },
    {
      category: CostCategory.PARKING,
      description: "Parking TIR - Hamburg",
      amount: 120.0,
      currency: "EUR",
      date: new Date("2026-01-12"),
    },
    {
      category: CostCategory.FUEL,
      description: "Tankowanie - Orlen Poznań",
      amount: 2800.0,
      currency: "PLN",
      date: new Date("2026-01-14"),
    },
    {
      category: CostCategory.INSURANCE,
      description: "Ubezpieczenie OC - WGM2001",
      amount: 3200.0,
      currency: "PLN",
      date: new Date("2026-01-01"),
    },
    {
      category: CostCategory.SERVICE,
      description: "Przegląd techniczny - Volvo DSR50038",
      amount: 850.0,
      currency: "PLN",
      date: new Date("2026-01-05"),
    },
    {
      category: CostCategory.TOLL,
      description: "Winiety - Austria, Niemcy",
      amount: 350.0,
      currency: "EUR",
      date: new Date("2026-01-11"),
    },
    {
      category: CostCategory.FUEL,
      description: "Tankowanie - BP Berlin",
      amount: 580.0,
      currency: "EUR",
      date: new Date("2026-01-13"),
    },
    {
      category: CostCategory.OTHER,
      description: "Myjnia TIR - Wrocław",
      amount: 250.0,
      currency: "PLN",
      date: new Date("2026-01-16"),
    },
  ];

  for (let i = 0; i < costsData.length; i++) {
    const costData = costsData[i];
    const existing = await prisma.cost.findFirst({
      where: {
        tenantId: tenant.id,
        description: costData.description,
        date: costData.date,
      },
    });

    if (!existing) {
      await prisma.cost.create({
        data: {
          ...costData,
          tenantId: tenant.id,
          vehicleId: vehicles[i % vehicles.length]?.id,
          driverId: drivers[i % drivers.length]?.id,
        },
      });
      console.log("✅ Created cost:", costData.description);
    }
  }

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
