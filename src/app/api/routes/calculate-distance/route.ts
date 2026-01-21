import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_BASE_URL = "https://api.openrouteservice.org";

interface GeocodingResult {
  lat: number;
  lng: number;
  label: string;
}

interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  origin: GeocodingResult;
  destination: GeocodingResult;
}

// Geocode address using OpenRouteService
async function geocodeAddress(address: string, country?: string): Promise<GeocodingResult | null> {
  try {
    const params = new URLSearchParams({
      api_key: ORS_API_KEY!,
      text: address,
      size: "1",
      "boundary.country": country || "PL,DE,CZ,SK,AT,NL,BE,FR,IT,ES",
    });

    const response = await fetch(`${ORS_BASE_URL}/geocode/search?${params}`);
    
    if (!response.ok) {
      console.error("Geocoding error:", await response.text());
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        label: feature.properties.label,
      };
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Calculate route using OpenRouteService Directions API
async function calculateRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  profile: string = "driving-hgv"
): Promise<{ distance: number; duration: number } | null> {
  try {
    const response = await fetch(`${ORS_BASE_URL}/v2/directions/${profile}`, {
      method: "POST",
      headers: {
        "Authorization": ORS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ],
        units: "km",
        geometry: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Routing error:", errorText);
      return null;
    }

    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0].summary;
      return {
        distance: route.distance, // w km
        duration: route.duration / 60, // konwersja z sekund na minuty
      };
    }
    
    return null;
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}

// POST /api/routes/calculate-distance
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    if (!ORS_API_KEY) {
      return NextResponse.json(
        { error: "Brak klucza API OpenRouteService" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { origin, destination, originCountry, destinationCountry, profile } = body;

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Wymagane są adresy załadunku i rozładunku" },
        { status: 400 }
      );
    }

    // Geocode origin
    const originGeo = await geocodeAddress(origin, originCountry);
    if (!originGeo) {
      return NextResponse.json(
        { error: "Nie udało się znaleźć adresu załadunku" },
        { status: 400 }
      );
    }

    // Geocode destination
    const destinationGeo = await geocodeAddress(destination, destinationCountry);
    if (!destinationGeo) {
      return NextResponse.json(
        { error: "Nie udało się znaleźć adresu rozładunku" },
        { status: 400 }
      );
    }

    // Calculate route
    const routeResult = await calculateRoute(
      originGeo,
      destinationGeo,
      profile || "driving-hgv"
    );

    if (!routeResult) {
      return NextResponse.json(
        { error: "Nie udało się obliczyć trasy" },
        { status: 400 }
      );
    }

    const result: RouteResult = {
      distanceKm: Math.round(routeResult.distance),
      durationMinutes: Math.round(routeResult.duration),
      origin: originGeo,
      destination: destinationGeo,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating distance:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas obliczania dystansu" },
      { status: 500 }
    );
  }
}
