import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_BASE_URL = "https://api.openrouteservice.org";

interface GeocodingResult {
  lat: number;
  lng: number;
  label: string;
}

interface RouteSegment {
  from: string;
  to: string;
  distanceKm: number;
  durationMinutes: number;
}

interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  origin: GeocodingResult;
  destination: GeocodingResult;
  waypoints?: GeocodingResult[];
  segments?: RouteSegment[];
}

// Geocode address using OpenRouteService
async function geocodeAddress(address: string, country?: string): Promise<GeocodingResult | null> {
  try {
    const params = new URLSearchParams({
      api_key: ORS_API_KEY!,
      text: address,
      size: "1",
      "boundary.country": country || "PL,DE,CZ,SK,AT,NL,BE,FR,IT,ES,HU,LT,LV,EE,UA,BY,RU",
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

// Calculate route using OpenRouteService Directions API with multiple waypoints
async function calculateRouteWithWaypoints(
  coordinates: Array<{ lat: number; lng: number }>,
  profile: string = "driving-hgv"
): Promise<{ distance: number; duration: number } | null> {
  try {
    // ORS expects coordinates as [lng, lat] pairs
    const orsCoordinates = coordinates.map(c => [c.lng, c.lat]);

    const response = await fetch(`${ORS_BASE_URL}/v2/directions/${profile}`, {
      method: "POST",
      headers: {
        "Authorization": ORS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: orsCoordinates,
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

// Calculate route segment by segment for detailed breakdown
async function calculateRouteSegments(
  points: Array<{ geo: GeocodingResult; label: string }>,
  profile: string = "driving-hgv"
): Promise<{ segments: RouteSegment[]; totalDistance: number; totalDuration: number } | null> {
  const segments: RouteSegment[] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];

    const result = await calculateRouteWithWaypoints(
      [{ lat: from.geo.lat, lng: from.geo.lng }, { lat: to.geo.lat, lng: to.geo.lng }],
      profile
    );

    if (!result) {
      return null;
    }

    segments.push({
      from: from.label,
      to: to.label,
      distanceKm: Math.round(result.distance),
      durationMinutes: Math.round(result.duration),
    });

    totalDistance += result.distance;
    totalDuration += result.duration;
  }

  return {
    segments,
    totalDistance: Math.round(totalDistance),
    totalDuration: Math.round(totalDuration),
  };
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
    const {
      origin,
      destination,
      originCountry,
      destinationCountry,
      waypoints,  // Array of { address: string, country?: string }
      profile,
      includeSegments = false  // Whether to include segment-by-segment breakdown
    } = body;

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

    // Geocode waypoints if provided
    const waypointGeos: GeocodingResult[] = [];
    if (waypoints && Array.isArray(waypoints) && waypoints.length > 0) {
      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        const wpGeo = await geocodeAddress(wp.address, wp.country);
        if (!wpGeo) {
          return NextResponse.json(
            { error: `Nie udało się znaleźć adresu punktu pośredniego #${i + 1}: ${wp.address}` },
            { status: 400 }
          );
        }
        waypointGeos.push(wpGeo);
      }
    }

    // Build complete route with all points
    const allPoints: Array<{ geo: GeocodingResult; label: string }> = [
      { geo: originGeo, label: originGeo.label },
      ...waypointGeos.map((geo, i) => ({
        geo,
        label: waypoints[i].address || geo.label
      })),
      { geo: destinationGeo, label: destinationGeo.label },
    ];

    // Calculate route
    let result: RouteResult;

    if (includeSegments && allPoints.length > 2) {
      // Calculate segment by segment for detailed breakdown
      const segmentResult = await calculateRouteSegments(allPoints, profile || "driving-hgv");

      if (!segmentResult) {
        return NextResponse.json(
          { error: "Nie udało się obliczyć trasy" },
          { status: 400 }
        );
      }

      result = {
        distanceKm: segmentResult.totalDistance,
        durationMinutes: segmentResult.totalDuration,
        origin: originGeo,
        destination: destinationGeo,
        waypoints: waypointGeos.length > 0 ? waypointGeos : undefined,
        segments: segmentResult.segments,
      };
    } else {
      // Calculate as single route through all waypoints
      const coordinates = allPoints.map(p => ({ lat: p.geo.lat, lng: p.geo.lng }));
      const routeResult = await calculateRouteWithWaypoints(coordinates, profile || "driving-hgv");

      if (!routeResult) {
        return NextResponse.json(
          { error: "Nie udało się obliczyć trasy" },
          { status: 400 }
        );
      }

      result = {
        distanceKm: Math.round(routeResult.distance),
        durationMinutes: Math.round(routeResult.duration),
        origin: originGeo,
        destination: destinationGeo,
        waypoints: waypointGeos.length > 0 ? waypointGeos : undefined,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating distance:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas obliczania dystansu" },
      { status: 500 }
    );
  }
}
