import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GUS API Configuration
const GUS_API_URL = "https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc";
const GUS_API_KEY = process.env.GUS_API_KEY || "e1b2cc959798465eb114";

// SOAP envelope templates
const createLoginEnvelope = (key: string) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
    <wsa:To>https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc</wsa:To>
    <wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj</wsa:Action>
  </soap:Header>
  <soap:Body>
    <ns:Zaloguj>
      <ns:pKluczUzytkownika>${key}</ns:pKluczUzytkownika>
    </ns:Zaloguj>
  </soap:Body>
</soap:Envelope>`;

const createSearchByNipEnvelope = (nip: string) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07" xmlns:dat="http://CIS/BIR/PUBL/2014/07/DataContract">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
    <wsa:To>https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc</wsa:To>
    <wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty</wsa:Action>
  </soap:Header>
  <soap:Body>
    <ns:DaneSzukajPodmioty>
      <ns:pParametryWyszukiwania>
        <dat:Nip>${nip}</dat:Nip>
      </ns:pParametryWyszukiwania>
    </ns:DaneSzukajPodmioty>
  </soap:Body>
</soap:Envelope>`;

const createLogoutEnvelope = () => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
    <wsa:To>https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc</wsa:To>
    <wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Wyloguj</wsa:Action>
  </soap:Header>
  <soap:Body>
    <ns:Wyloguj/>
  </soap:Body>
</soap:Envelope>`;

// Helper to extract value from XML
function extractXmlValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1] : null;
}

// Helper to extract value from dane element
function extractDaneValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, "gi");
  const match = xml.match(regex);
  if (match && match[0]) {
    const valueMatch = match[0].match(/>([^<]*)</);
    return valueMatch ? valueMatch[1] : null;
  }
  return null;
}

// Make SOAP request
async function soapRequest(envelope: string, sessionId?: string): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/soap+xml; charset=utf-8",
  };

  if (sessionId) {
    headers["sid"] = sessionId;
  }

  const response = await fetch(GUS_API_URL, {
    method: "POST",
    headers,
    body: envelope,
  });

  if (!response.ok) {
    throw new Error(`GUS API error: ${response.status}`);
  }

  return response.text();
}

// Parse company data from GUS response
function parseCompanyData(xml: string) {
  // The response contains escaped XML in DaneSzukajPodmiotyResult
  const resultMatch = xml.match(/<DaneSzukajPodmiotyResult>([^]*?)<\/DaneSzukajPodmiotyResult>/);
  if (!resultMatch) {
    return null;
  }

  // Unescape HTML entities
  let data = resultMatch[1]
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');

  // Check if we got any data
  if (!data.includes("<dane>")) {
    return null;
  }

  // Extract values
  const regon = extractDaneValue(data, "Regon");
  const nip = extractDaneValue(data, "Nip");
  const name = extractDaneValue(data, "Nazwa");
  const province = extractDaneValue(data, "Wojewodztwo");
  const county = extractDaneValue(data, "Powiat");
  const commune = extractDaneValue(data, "Gmina");
  const city = extractDaneValue(data, "Miejscowosc");
  const postalCode = extractDaneValue(data, "KodPocztowy");
  const street = extractDaneValue(data, "Ulica");
  const buildingNumber = extractDaneValue(data, "NrNieruchomosci");
  const apartmentNumber = extractDaneValue(data, "NrLokalu");
  const type = extractDaneValue(data, "Typ"); // P = prawna, F = fizyczna

  // Build full address
  let address = "";
  if (street) {
    address = street;
    if (buildingNumber) {
      address += ` ${buildingNumber}`;
      if (apartmentNumber) {
        address += `/${apartmentNumber}`;
      }
    }
  }

  return {
    regon: regon?.trim() || null,
    nip: nip?.trim() || null,
    name: name?.trim() || null,
    province: province?.trim() || null,
    county: county?.trim() || null,
    commune: commune?.trim() || null,
    city: city?.trim() || null,
    postalCode: postalCode?.trim() || null,
    address: address.trim() || null,
    type: type?.trim() || null,
  };
}

// POST /api/gus/search - Search company by NIP
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nip } = body;

    if (!nip) {
      return NextResponse.json({ error: "NIP jest wymagany" }, { status: 400 });
    }

    // Clean NIP - remove dashes and spaces
    const cleanNip = nip.replace(/[-\s]/g, "");

    // Validate NIP format (10 digits)
    if (!/^\d{10}$/.test(cleanNip)) {
      return NextResponse.json(
        { error: "Nieprawidlowy format NIP (wymagane 10 cyfr)" },
        { status: 400 }
      );
    }

    // Step 1: Login to GUS
    const loginResponse = await soapRequest(createLoginEnvelope(GUS_API_KEY));
    const sessionId = extractXmlValue(loginResponse, "ZalogujResult");

    if (!sessionId) {
      console.error("GUS login failed:", loginResponse);
      return NextResponse.json(
        { error: "Blad logowania do GUS" },
        { status: 500 }
      );
    }

    try {
      // Step 2: Search by NIP
      const searchResponse = await soapRequest(
        createSearchByNipEnvelope(cleanNip),
        sessionId
      );

      // Parse company data
      const companyData = parseCompanyData(searchResponse);

      if (!companyData) {
        return NextResponse.json(
          { error: "Nie znaleziono firmy o podanym NIP", found: false },
          { status: 404 }
        );
      }

      return NextResponse.json({
        found: true,
        data: companyData,
      });
    } finally {
      // Step 3: Logout (always)
      try {
        await soapRequest(createLogoutEnvelope(), sessionId);
      } catch (e) {
        console.error("GUS logout error:", e);
      }
    }
  } catch (error) {
    console.error("GUS search error:", error);
    return NextResponse.json(
      { error: "Wystapil blad podczas wyszukiwania w GUS" },
      { status: 500 }
    );
  }
}
