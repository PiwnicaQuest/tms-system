import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface NbpRate {
  table: string;
  currency: string;
  code: string;
  rates: Array<{
    no: string;
    effectiveDate: string;
    mid: number;
  }>;
}

interface NbpRateResponse {
  currency: string;
  code: string;
  rate: number;
  date: string;
  table: string;
  tableNumber: string;
}

// Cache for rates (simple in-memory cache)
const rateCache = new Map<string, { data: NbpRateResponse; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get exchange rate from NBP API
 * Table A - average exchange rates
 */
async function fetchNbpRate(
  currency: string,
  date: string
): Promise<NbpRateResponse | null> {
  const cacheKey = `${currency}-${date}`;
  const cached = rateCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Try to get rate for specific date
    const url = `https://api.nbp.pl/api/exchangerates/rates/a/${currency.toLowerCase()}/${date}/?format=json`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      const data: NbpRate = await response.json();
      const rate = data.rates[0];
      
      const result: NbpRateResponse = {
        currency: data.currency,
        code: data.code,
        rate: rate.mid,
        date: rate.effectiveDate,
        table: data.table,
        tableNumber: rate.no,
      };
      
      rateCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }

    // If 404 (no rate for this date - weekend/holiday), try to find last available
    if (response.status === 404) {
      return null;
    }

    throw new Error(`NBP API error: ${response.status}`);
  } catch (error) {
    console.error("Error fetching NBP rate:", error);
    throw error;
  }
}

/**
 * Find the last available rate before a given date
 * NBP doesn't publish rates on weekends and holidays
 */
async function findLastAvailableRate(
  currency: string,
  startDate: string,
  maxDaysBack: number = 7
): Promise<NbpRateResponse | null> {
  const date = new Date(startDate);
  
  for (let i = 0; i < maxDaysBack; i++) {
    const dateStr = date.toISOString().split("T")[0];
    const rate = await fetchNbpRate(currency, dateStr);
    
    if (rate) {
      return rate;
    }
    
    // Go back one day
    date.setDate(date.getDate() - 1);
  }
  
  return null;
}

/**
 * GET /api/nbp/rates
 * Query params:
 * - currency: Currency code (EUR, USD, GBP, etc.)
 * - date: Date for the rate (YYYY-MM-DD)
 * - findPrevious: If true, find the last available rate if the given date has no rate
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const currency = searchParams.get("currency")?.toUpperCase();
    const date = searchParams.get("date");
    const findPrevious = searchParams.get("findPrevious") === "true";

    if (!currency) {
      return NextResponse.json(
        { error: "Currency is required" },
        { status: 400 }
      );
    }

    if (currency === "PLN") {
      return NextResponse.json(
        { error: "PLN does not need conversion" },
        { status: 400 }
      );
    }

    // Validate currency - common currencies
    const validCurrencies = ["EUR", "USD", "GBP", "CHF", "CZK", "DKK", "NOK", "SEK", "HUF", "UAH"];
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: `Unsupported currency: ${currency}. Supported: ${validCurrencies.join(", ")}` },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Check if date is not in the future
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requestedDate > today) {
      return NextResponse.json(
        { error: "Cannot get rate for future date" },
        { status: 400 }
      );
    }

    // Try to get rate for the specific date
    let rate = await fetchNbpRate(currency, date);

    // If no rate found and findPrevious is true, search for last available
    if (!rate && findPrevious) {
      rate = await findLastAvailableRate(currency, date);
    }

    if (!rate) {
      return NextResponse.json(
        { 
          error: "No exchange rate available for this date",
          message: "NBP nie publikuje kursow w weekendy i swieta. Sprobuj wybrac inny dzien."
        },
        { status: 404 }
      );
    }

    return NextResponse.json(rate);
  } catch (error) {
    console.error("Error in NBP rates API:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rate" },
      { status: 500 }
    );
  }
}
