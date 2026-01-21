import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { CMRPDF, type CMROrderData } from "@/lib/documents/cmr-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/orders/[id]/cmr - Generate CMR PDF for order
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Fetch order with all related data needed for CMR
    const order = await prisma.order.findUnique({
      where: { id, tenantId },
      include: {
        contractor: {
          select: {
            name: true,
            address: true,
            city: true,
            postalCode: true,
            country: true,
            nip: true,
            phone: true,
            email: true,
          },
        },
        driver: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            registrationNumber: true,
            brand: true,
            model: true,
          },
        },
        trailer: {
          select: {
            registrationNumber: true,
          },
        },
        tenant: {
          select: {
            name: true,
            address: true,
            city: true,
            postalCode: true,
            country: true,
            nip: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Zlecenie nie zostalo znalezione" },
        { status: 404 }
      );
    }

    // Prepare CMR data for PDF template
    const cmrData: CMROrderData = {
      orderNumber: order.orderNumber,
      externalNumber: order.externalNumber,
      // Route
      origin: order.origin,
      originCity: order.originCity,
      originCountry: order.originCountry,
      destination: order.destination,
      destinationCity: order.destinationCity,
      destinationCountry: order.destinationCountry,
      // Dates
      loadingDate: order.loadingDate,
      unloadingDate: order.unloadingDate,
      // Cargo
      cargoDescription: order.cargoDescription,
      cargoWeight: order.cargoWeight,
      cargoVolume: order.cargoVolume,
      cargoPallets: order.cargoPallets,
      // Notes
      notes: order.notes,
      // Relations
      contractor: order.contractor,
      tenant: order.tenant,
      driver: order.driver,
      vehicle: order.vehicle,
      trailer: order.trailer,
    };

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(CMRPDF({ order: cmrData }));

    // Convert Buffer to Uint8Array for NextResponse
    const pdfUint8Array = new Uint8Array(pdfBuffer);

    // Generate filename
    const sanitizedNumber = order.orderNumber.replace(/[/\\]/g, "-");
    const filename = `CMR-${sanitizedNumber}.pdf`;

    // Return PDF response
    return new NextResponse(pdfUint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating CMR PDF:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas generowania dokumentu CMR" },
      { status: 500 }
    );
  }
}
