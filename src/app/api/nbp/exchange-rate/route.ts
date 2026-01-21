import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface NBPRate {
  table: string;
  currency: string;
  code: string;
  rates: Array<{
    no: string;
    effectiveDate: string;
    mid: number;
  }>;
}

// GET /api/nbp/exchange-rate?currency=EUR&date=2024-01-15
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const currency = searchParams.get("currency")?.toUpperCase();
    const date = searchParams.get("date"); // Format: YYYY-MM-DD

    if (!currency) {
      return NextResponse.json(
        { error: "Parametr 'currency' jest wymagany" },
        { status: 400 }
      );
    }

    // Validate currency code
    const supportedCurrencies = ["EUR", "USD", "GBP", "CHF", "CZK", "DKK", "NOK", "SEK"];
    if (!supportedCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: `Nieobsługiwana waluta. Obsługiwane: ${supportedCurrencies.join(", ")}` },
        { status: 400 }
      );
    }

    // Build NBP API URL
    // Table A contains average exchange rates
    let nbpUrl: string;

    if (date) {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return NextResponse.json(
          { error: "Nieprawidłowy format daty. Użyj formatu YYYY-MM-DD" },
          { status: 400 }
        );
      }

      // Check if date is not in the future
      const requestedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (requestedDate > today) {
        return NextResponse.json(
          { error: "Nie można pobrać kursu z przyszłej daty" },
          { status: 400 }
        );
      }

      nbpUrl = `https://api.nbp.pl/api/exchangerates/rates/a/${currency}/${date}/`;
    } else {
      // Get the latest rate
      nbpUrl = `https://api.nbp.pl/api/exchangerates/rates/a/${currency}/`;
    }

    // Fetch from NBP API
    const response = await fetch(nbpUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // NBP doesn't publish rates on weekends and holidays
        // Try to get the last available rate before the requested date
        if (date) {
          const lastAvailableUrl = `https://api.nbp.pl/api/exchangerates/rates/a/${currency}/last/1/`;
          const lastResponse = await fetch(lastAvailableUrl, {
            headers: { "Accept": "application/json" },
          });

          if (lastResponse.ok) {
            const lastData: NBPRate = await lastResponse.json();
            const rate = lastData.rates[0];

            return NextResponse.json({
              currency: lastData.code,
              rate: rate.mid,
              date: rate.effectiveDate,
              table: rate.no,
              warning: `Brak kursu na dzień ${date}. Pokazano ostatni dostępny kurs z dnia ${rate.effectiveDate}.`,
            });
          }
        }

        return NextResponse.json(
          { error: "Nie znaleziono kursu dla podanej daty. NBP nie publikuje kursów w weekendy i święta." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "Błąd podczas pobierania kursu z NBP" },
        { status: response.status }
      );
    }

    const data: NBPRate = await response.json();
    const rate = data.rates[0];

    return NextResponse.json({
      currency: data.code,
      rate: rate.mid,
      date: rate.effectiveDate,
      table: rate.no,
    });
  } catch (error) {
    console.error("Error fetching NBP exchange rate:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania kursu walut" },
      { status: 500 }
    );
  }
}
