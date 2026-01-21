import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// Validation schemas
const companySettingsSchema = z.object({
  name: z.string().min(1, "Nazwa firmy jest wymagana"),
  nip: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().default("PL"),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  logo: z.string().nullable().optional(),
});

const invoiceSettingsSchema = z.object({
  paymentDays: z.number().int().min(1).max(180).default(14),
  bankAccount: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  swiftCode: z.string().nullable().optional(),
  defaultVatRate: z.number().int().min(0).max(100).default(23),
  invoicePrefix: z.string().default("FV"),
  defaultNotes: z.string().nullable().optional(),
});

const ksefSettingsSchema = z.object({
  ksefEnabled: z.boolean().default(false),
  ksefEnvironment: z.enum(["test", "production"]).default("test"),
  ksefNip: z.string().nullable().optional(),
});

const updateSettingsSchema = z.object({
  type: z.enum(["company", "invoice", "ksef"]),
  data: z.unknown(),
});

// GET /api/settings - Get tenant settings
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Brak przypisanego tenanta" },
        { status: 403 }
      );
    }

    // Get tenant data with invoice settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        nip: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        phone: true,
        email: true,
        logo: true,
        plan: true,
        invoiceSettings: {
          select: {
            paymentDays: true,
            bankAccount: true,
            bankName: true,
            swiftCode: true,
            defaultVatRate: true,
            invoicePrefix: true,
            nextInvoiceNumber: true,
            defaultNotes: true,
            ksefEnabled: true,
            ksefEnvironment: true,
            ksefNip: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant nie istnieje" },
        { status: 404 }
      );
    }

    // Return invoice settings or defaults
    const invoiceSettings = tenant.invoiceSettings || {
      paymentDays: 14,
      bankAccount: null,
      bankName: null,
      swiftCode: null,
      defaultVatRate: 23,
      invoicePrefix: "FV",
      nextInvoiceNumber: 1,
      defaultNotes: null,
      ksefEnabled: false,
      ksefEnvironment: "test",
      ksefNip: null,
    };

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        nip: tenant.nip,
        address: tenant.address,
        city: tenant.city,
        postalCode: tenant.postalCode,
        country: tenant.country,
        phone: tenant.phone,
        email: tenant.email,
        logo: tenant.logo,
        plan: tenant.plan,
      },
      invoiceSettings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas pobierania ustawien" },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update tenant settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Brak przypisanego tenanta" },
        { status: 403 }
      );
    }

    // Check user role - only admins can update settings
    const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Brak uprawnien do zmiany ustawien" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedPayload = updateSettingsSchema.safeParse(body);

    if (!validatedPayload.success) {
      return NextResponse.json(
        {
          error: "Nieprawidlowe dane",
          details: validatedPayload.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { type, data } = validatedPayload.data;

    if (type === "company") {
      const validatedData = companySettingsSchema.safeParse(data);

      if (!validatedData.success) {
        return NextResponse.json(
          {
            error: "Nieprawidlowe dane firmy",
            details: validatedData.error.flatten(),
          },
          { status: 400 }
        );
      }

      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: validatedData.data.name,
          nip: validatedData.data.nip,
          address: validatedData.data.address,
          city: validatedData.data.city,
          postalCode: validatedData.data.postalCode,
          country: validatedData.data.country,
          phone: validatedData.data.phone,
          email: validatedData.data.email,
          logo: validatedData.data.logo,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          nip: true,
          address: true,
          city: true,
          postalCode: true,
          country: true,
          phone: true,
          email: true,
          logo: true,
          plan: true,
        },
      });

      return NextResponse.json({ tenant: updatedTenant });
    }

    if (type === "invoice") {
      const validatedData = invoiceSettingsSchema.safeParse(data);

      if (!validatedData.success) {
        return NextResponse.json(
          {
            error: "Nieprawidlowe dane faktur",
            details: validatedData.error.flatten(),
          },
          { status: 400 }
        );
      }

      // Upsert invoice settings
      const invoiceSettings = await prisma.invoiceSettings.upsert({
        where: { tenantId },
        update: {
          paymentDays: validatedData.data.paymentDays,
          bankAccount: validatedData.data.bankAccount,
          bankName: validatedData.data.bankName,
          swiftCode: validatedData.data.swiftCode,
          defaultVatRate: validatedData.data.defaultVatRate,
          invoicePrefix: validatedData.data.invoicePrefix,
          defaultNotes: validatedData.data.defaultNotes,
        },
        create: {
          tenantId,
          paymentDays: validatedData.data.paymentDays,
          bankAccount: validatedData.data.bankAccount,
          bankName: validatedData.data.bankName,
          swiftCode: validatedData.data.swiftCode,
          defaultVatRate: validatedData.data.defaultVatRate,
          invoicePrefix: validatedData.data.invoicePrefix,
          defaultNotes: validatedData.data.defaultNotes,
        },
      });

      return NextResponse.json({
        message: "Ustawienia faktur zostaly zapisane",
        invoiceSettings,
      });
    }

    if (type === "ksef") {
      const validatedData = ksefSettingsSchema.safeParse(data);

      if (!validatedData.success) {
        return NextResponse.json(
          {
            error: "Nieprawidlowe dane KSeF",
            details: validatedData.error.flatten(),
          },
          { status: 400 }
        );
      }

      // Upsert KSeF settings (stored in InvoiceSettings)
      const invoiceSettings = await prisma.invoiceSettings.upsert({
        where: { tenantId },
        update: {
          ksefEnabled: validatedData.data.ksefEnabled,
          ksefEnvironment: validatedData.data.ksefEnvironment,
          ksefNip: validatedData.data.ksefNip,
        },
        create: {
          tenantId,
          ksefEnabled: validatedData.data.ksefEnabled,
          ksefEnvironment: validatedData.data.ksefEnvironment,
          ksefNip: validatedData.data.ksefNip,
        },
      });

      return NextResponse.json({
        message: "Ustawienia KSeF zostaly zapisane",
        ksefSettings: {
          ksefEnabled: invoiceSettings.ksefEnabled,
          ksefEnvironment: invoiceSettings.ksefEnvironment,
          ksefNip: invoiceSettings.ksefNip,
        },
      });
    }

    return NextResponse.json({ error: "Nieznany typ ustawien" }, { status: 400 });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas zapisywania ustawien" },
      { status: 500 }
    );
  }
}
