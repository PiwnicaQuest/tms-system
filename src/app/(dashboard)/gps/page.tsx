"use client";

import { MapPin } from "lucide-react";
import { VehicleMap } from "@/components/map/vehicle-map";

export default function GpsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MapPin className="h-8 w-8" />
          Mapa GPS
        </h1>
        <p className="text-muted-foreground">
          Sledz lokalizacje pojazdow w czasie rzeczywistym
        </p>
      </div>

      {/* Map Component */}
      <VehicleMap />
    </div>
  );
}
