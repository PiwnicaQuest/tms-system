"use client";

import { Suspense, useEffect, useState } from "react";
import { PageLoading } from "@/components/ui/page-loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, RefreshCw, X } from "lucide-react";
import { OrdersCalendar } from "@/components/orders/orders-calendar";

// Order status type
type OrderStatus =
  | "PLANNED"
  | "ASSIGNED"
  | "CONFIRMED"
  | "LOADING"
  | "IN_TRANSIT"
  | "UNLOADING"
  | "COMPLETED"
  | "CANCELLED"
  | "PROBLEM";

// Status labels in Polish
const statusLabels: Record<OrderStatus, string> = {
  PLANNED: "Zaplanowane",
  ASSIGNED: "Przypisane",
  CONFIRMED: "Potwierdzone",
  LOADING: "Zaladunek",
  IN_TRANSIT: "W trasie",
  UNLOADING: "Rozladunek",
  COMPLETED: "Zrealizowane",
  CANCELLED: "Anulowane",
  PROBLEM: "Problem",
};

// Status colors for legend
const statusColors: Record<OrderStatus, string> = {
  PLANNED: "#64748b",
  ASSIGNED: "#eab308",
  CONFIRMED: "#06b6d4",
  LOADING: "#f59e0b",
  IN_TRANSIT: "#22c55e",
  UNLOADING: "#a855f7",
  COMPLETED: "#6b7280",
  CANCELLED: "#ef4444",
  PROBLEM: "#f97316",
};

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
}

interface Vehicle {
  id: string;
  registrationNumber: string;
}

function CalendarPageContent() {
  // Filter state
  const [status, setStatus] = useState("all");
  const [driverId, setDriverId] = useState("all");
  const [vehicleId, setVehicleId] = useState("all");

  // Resources for filters
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Key for forcing calendar refresh
  const [calendarKey, setCalendarKey] = useState(0);

  // Fetch drivers and vehicles for filters
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const [driversRes, vehiclesRes] = await Promise.all([
          fetch("/api/drivers?limit=100"),
          fetch("/api/vehicles?limit=100"),
        ]);

        if (driversRes.ok) {
          const data = await driversRes.json();
          setDrivers(data.data || []);
        }

        if (vehiclesRes.ok) {
          const data = await vehiclesRes.json();
          setVehicles(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching resources:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  // Clear filters
  const clearFilters = () => {
    setStatus("all");
    setDriverId("all");
    setVehicleId("all");
  };

  // Check if filters are active
  const hasActiveFilters = (status && status !== "all") || (driverId && driverId !== "all") || (vehicleId && vehicleId !== "all");

  // Refresh calendar
  const handleRefresh = () => {
    setCalendarKey((prev) => prev + 1);
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Kalendarz zlecen
          </h1>
          <p className="text-muted-foreground">
            Widok kalendarza z wszystkimi zleceniami transportowymi
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Odswiez
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtry</CardTitle>
          <CardDescription>
            Filtruj zlecenia wyswietlane na kalendarzu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[180px]">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Wszystkie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: statusColors[key as OrderStatus],
                          }}
                        />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-[180px]">
              <Label>Kierowca</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wszyscy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszyscy</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-[180px]">
              <Label>Pojazd</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wszystkie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registrationNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Wyczysc filtry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Legenda statusow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(statusLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: statusColors[key as OrderStatus] }}
                />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="pt-6">
          <OrdersCalendar
            key={calendarKey}
            status={status && status !== "all" ? status : undefined}
            driverId={driverId && driverId !== "all" ? driverId : undefined}
            vehicleId={vehicleId && vehicleId !== "all" ? vehicleId : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CalendarPageContent />
    </Suspense>
  );
}
