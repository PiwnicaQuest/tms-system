"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw,
  Truck,
  MapPin,
  User,
  Phone,
  Navigation,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface VehicleLocation {
  id: string;
  registrationNumber: string;
  type: string;
  brand: string | null;
  model: string | null;
  latitude: number | null;
  longitude: number | null;
  lastUpdate: string | null;
  hasGps: boolean;
  driver: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  currentOrder: {
    id: string;
    orderNumber: string;
    route: string;
    status: string;
  } | null;
}

const statusColors: Record<string, string> = {
  ASSIGNED: "bg-blue-500",
  CONFIRMED: "bg-blue-600",
  LOADING: "bg-yellow-500",
  IN_TRANSIT: "bg-green-500",
  UNLOADING: "bg-orange-500",
};

const statusLabels: Record<string, string> = {
  ASSIGNED: "Przypisany",
  CONFIRMED: "Potwierdzony",
  LOADING: "Załadunek",
  IN_TRANSIT: "W trasie",
  UNLOADING: "Rozładunek",
};

export function VehicleMap() {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [vehiclesWithoutGps, setVehiclesWithoutGps] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/vehicles/locations");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
        setVehiclesWithoutGps(data.vehiclesWithoutGps || []);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    setMapReady(true);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Calculate map center (Poland default or centroid of vehicles)
  const getMapCenter = (): [number, number] => {
    if (vehicles.length === 0) {
      return [52.0693, 19.4803]; // Center of Poland
    }

    const validVehicles = vehicles.filter((v) => v.latitude && v.longitude);
    if (validVehicles.length === 0) {
      return [52.0693, 19.4803];
    }

    const sumLat = validVehicles.reduce((sum, v) => sum + (v.latitude || 0), 0);
    const sumLng = validVehicles.reduce((sum, v) => sum + (v.longitude || 0), 0);
    return [sumLat / validVehicles.length, sumLng / validVehicles.length];
  };

  const VehicleCard = ({ vehicle }: { vehicle: VehicleLocation }) => (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        selectedVehicle?.id === vehicle.id
          ? "border-primary bg-primary/5"
          : "hover:bg-muted/50"
      }`}
      onClick={() => setSelectedVehicle(vehicle)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{vehicle.registrationNumber}</span>
        </div>
        {vehicle.hasGps ? (
          <Badge variant="outline" className="text-green-600 border-green-600">
            GPS
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-400">
            Brak GPS
          </Badge>
        )}
      </div>

      {vehicle.driver && (
        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <User className="h-3 w-3" />
          {vehicle.driver.name}
        </div>
      )}

      {vehicle.currentOrder && (
        <div className="mt-2">
          <Badge
            className={`${statusColors[vehicle.currentOrder.status] || "bg-gray-500"} text-white`}
          >
            {statusLabels[vehicle.currentOrder.status] || vehicle.currentOrder.status}
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {vehicle.currentOrder.route}
          </p>
        </div>
      )}

      {vehicle.lastUpdate && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(vehicle.lastUpdate), {
            addSuffix: true,
            locale: pl,
          })}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
      {/* Vehicle List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Pojazdy</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchLocations}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              GPS: {vehicles.length}
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-gray-400" />
              Brak: {vehiclesWithoutGps.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-340px)]">
            <div className="space-y-2 p-4 pt-0">
              {vehicles.length === 0 && vehiclesWithoutGps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Brak pojazdów</p>
                </div>
              ) : (
                <>
                  {vehicles.map((vehicle) => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} />
                  ))}
                  {vehiclesWithoutGps.length > 0 && (
                    <>
                      <div className="py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Bez GPS ({vehiclesWithoutGps.length})
                      </div>
                      {vehiclesWithoutGps.map((vehicle) => (
                        <VehicleCard key={vehicle.id} vehicle={vehicle} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="lg:col-span-3">
        <CardContent className="p-0 h-full">
          {mapReady ? (
            <MapContainer
              center={getMapCenter()}
              zoom={7}
              className="h-full w-full rounded-lg"
              style={{ minHeight: "500px" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {vehicles.map((vehicle) => {
                if (!vehicle.latitude || !vehicle.longitude) return null;

                return (
                  <Marker
                    key={vehicle.id}
                    position={[vehicle.latitude, vehicle.longitude]}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-bold text-lg flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          {vehicle.registrationNumber}
                        </div>
                        {vehicle.brand && vehicle.model && (
                          <p className="text-sm text-gray-600">
                            {vehicle.brand} {vehicle.model}
                          </p>
                        )}

                        {vehicle.driver && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center gap-1 text-sm">
                              <User className="h-3 w-3" />
                              {vehicle.driver.name}
                            </div>
                            {vehicle.driver.phone && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Phone className="h-3 w-3" />
                                <a href={`tel:${vehicle.driver.phone}`}>
                                  {vehicle.driver.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {vehicle.currentOrder && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <Navigation className="h-3 w-3" />
                              {vehicle.currentOrder.orderNumber}
                            </div>
                            <p className="text-sm text-gray-600">
                              {vehicle.currentOrder.route}
                            </p>
                            <Badge
                              className={`mt-1 ${
                                statusColors[vehicle.currentOrder.status] ||
                                "bg-gray-500"
                              } text-white`}
                            >
                              {statusLabels[vehicle.currentOrder.status] ||
                                vehicle.currentOrder.status}
                            </Badge>
                          </div>
                        )}

                        {vehicle.lastUpdate && (
                          <div className="mt-2 pt-2 border-t text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Aktualizacja:{" "}
                            {formatDistanceToNow(new Date(vehicle.lastUpdate), {
                              addSuffix: true,
                              locale: pl,
                            })}
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-400">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {vehicle.latitude?.toFixed(5)}, {vehicle.longitude?.toFixed(5)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Vehicle Details (mobile) */}
      {selectedVehicle && !selectedVehicle.hasGps && (
        <Card className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{selectedVehicle.registrationNumber}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Brak danych GPS
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVehicle(null)}
              >
                Zamknij
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
