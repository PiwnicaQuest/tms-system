"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventClickArg, DatesSetArg, EventDropArg } from "@fullcalendar/core";
import type { EventImpl } from "@fullcalendar/core/internal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Calendar,
  Truck,
  User,
  Package,
  Building2,
  ExternalLink,
} from "lucide-react";

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

// Status colors for badges
const statusColors: Record<OrderStatus, string> = {
  PLANNED: "bg-slate-500 hover:bg-slate-600",
  ASSIGNED: "bg-yellow-500 hover:bg-yellow-600",
  CONFIRMED: "bg-cyan-500 hover:bg-cyan-600",
  LOADING: "bg-amber-500 hover:bg-amber-600",
  IN_TRANSIT: "bg-green-500 hover:bg-green-600",
  UNLOADING: "bg-purple-500 hover:bg-purple-600",
  COMPLETED: "bg-gray-500 hover:bg-gray-600",
  CANCELLED: "bg-red-500 hover:bg-red-600",
  PROBLEM: "bg-orange-500 hover:bg-orange-600",
};

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    orderNumber: string;
    externalNumber: string | null;
    status: OrderStatus;
    statusLabel: string;
    type: string;
    origin: string;
    originCity: string | null;
    originCountry: string;
    destination: string;
    destinationCity: string | null;
    destinationCountry: string;
    route: string;
    loadingDate: string;
    loadingTimeFrom: string | null;
    loadingTimeTo: string | null;
    unloadingDate: string;
    unloadingTimeFrom: string | null;
    unloadingTimeTo: string | null;
    driverId: string | null;
    driverName: string | null;
    vehicleId: string | null;
    vehicleReg: string | null;
    trailerId: string | null;
    trailerReg: string | null;
    contractorId: string | null;
    contractorName: string | null;
    priceNet: number | null;
    currency: string;
    cargoDescription: string | null;
    distanceKm: number | null;
  };
}

interface OrdersCalendarProps {
  status?: string;
  driverId?: string;
  vehicleId?: string;
}

export function OrdersCalendar({
  status,
  driverId,
  vehicleId,
}: OrdersCalendarProps) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentDateRange, setCurrentDateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Fetch calendar events
  const fetchEvents = useCallback(
    async (start: Date, end: Date) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("start", start.toISOString());
        params.set("end", end.toISOString());
        if (status) params.set("status", status);
        if (driverId) params.set("driverId", driverId);
        if (vehicleId) params.set("vehicleId", vehicleId);

        const response = await fetch(`/api/orders/calendar?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch events");

        const data: CalendarEvent[] = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Error fetching calendar events:", error);
      } finally {
        setLoading(false);
      }
    },
    [status, driverId, vehicleId]
  );

  // Refetch when filters change
  useEffect(() => {
    if (currentDateRange) {
      fetchEvents(currentDateRange.start, currentDateRange.end);
    }
  }, [status, driverId, vehicleId, currentDateRange, fetchEvents]);

  // Handle date range change
  const handleDatesSet = useCallback(
    (dateInfo: DatesSetArg) => {
      const newRange = { start: dateInfo.start, end: dateInfo.end };
      setCurrentDateRange(newRange);
      fetchEvents(dateInfo.start, dateInfo.end);
    },
    [fetchEvents]
  );

  // Handle event click
  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const event = clickInfo.event as EventImpl;
    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      allDay: event.allDay,
      color: event.backgroundColor || "",
      borderColor: event.borderColor || "",
      textColor: event.textColor || "",
      extendedProps: event.extendedProps as CalendarEvent["extendedProps"],
    };
    setSelectedEvent(calendarEvent);
    setDialogOpen(true);
  }, []);

  // Handle event drop (drag and drop)
  const handleEventDrop = useCallback(
    async (dropInfo: EventDropArg) => {
      const event = dropInfo.event;
      const orderId = event.id;
      const newLoadingDate = event.start;
      const newUnloadingDate = event.end;

      if (!newLoadingDate) {
        dropInfo.revert();
        return;
      }

      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loadingDate: newLoadingDate.toISOString(),
            unloadingDate: newUnloadingDate?.toISOString() || newLoadingDate.toISOString(),
          }),
        });

        if (!response.ok) {
          dropInfo.revert();
          const data = await response.json();
          alert(data.error || "Wystapil blad podczas aktualizacji zlecenia");
        }
      } catch (error) {
        console.error("Error updating order:", error);
        dropInfo.revert();
        alert("Wystapil blad podczas aktualizacji zlecenia");
      }
    },
    []
  );

  // Navigate to order details
  const handleViewDetails = useCallback(() => {
    if (selectedEvent) {
      router.push(`/orders/${selectedEvent.id}`);
    }
  }, [selectedEvent, router]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (timeFrom: string | null, timeTo: string | null) => {
    if (!timeFrom && !timeTo) return null;
    if (timeFrom && timeTo) return `${timeFrom} - ${timeTo}`;
    return timeFrom || timeTo;
  };

  // Format price
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return "-";
    return `${price.toLocaleString("pl-PL")} ${currency}`;
  };

  return (
    <div className="orders-calendar">
      <style jsx global>{`
        .orders-calendar .fc {
          --fc-border-color: hsl(var(--border));
          --fc-button-bg-color: hsl(var(--primary));
          --fc-button-border-color: hsl(var(--primary));
          --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
          --fc-button-hover-border-color: hsl(var(--primary) / 0.9);
          --fc-button-active-bg-color: hsl(var(--primary) / 0.8);
          --fc-button-active-border-color: hsl(var(--primary) / 0.8);
          --fc-today-bg-color: hsl(var(--primary) / 0.1);
          --fc-event-border-color: transparent;
          --fc-page-bg-color: hsl(var(--background));
          --fc-neutral-bg-color: hsl(var(--muted));
          --fc-list-event-hover-bg-color: hsl(var(--accent));
        }

        .orders-calendar .fc-theme-standard td,
        .orders-calendar .fc-theme-standard th {
          border-color: hsl(var(--border));
        }

        .orders-calendar .fc-theme-standard .fc-scrollgrid {
          border-color: hsl(var(--border));
        }

        .orders-calendar .fc-col-header-cell-cushion,
        .orders-calendar .fc-daygrid-day-number {
          color: hsl(var(--foreground));
        }

        .orders-calendar .fc-button {
          font-weight: 500;
          text-transform: none;
        }

        .orders-calendar .fc-toolbar-title {
          color: hsl(var(--foreground));
          font-weight: 600;
        }

        .orders-calendar .fc-event {
          cursor: pointer;
          border-radius: 4px;
          font-size: 0.75rem;
          padding: 2px 4px;
        }

        .orders-calendar .fc-event-title {
          font-weight: 500;
        }

        .orders-calendar .fc-daygrid-event {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .orders-calendar .fc-list-event-title {
          color: hsl(var(--foreground));
        }

        .orders-calendar .fc-list-day-cushion {
          background-color: hsl(var(--muted));
        }

        .orders-calendar .fc-list-day-text,
        .orders-calendar .fc-list-day-side-text {
          color: hsl(var(--foreground));
        }

        .orders-calendar .fc-popover {
          background-color: hsl(var(--background));
          border-color: hsl(var(--border));
        }

        .orders-calendar .fc-popover-header {
          background-color: hsl(var(--muted));
        }

        .orders-calendar .fc-more-link {
          color: hsl(var(--primary));
        }

        .orders-calendar .fc-daygrid-day.fc-day-today {
          background-color: hsl(var(--primary) / 0.05);
        }
      `}</style>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        locale="pl"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        buttonText={{
          today: "Dzis",
          month: "Miesiac",
          week: "Tydzien",
          day: "Dzien",
          list: "Lista",
        }}
        events={events}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n} wiecej`}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        eventDrop={handleEventDrop}
        loading={(isLoading) => setLoading(isLoading)}
        height="auto"
        aspectRatio={1.8}
        firstDay={1}
        weekNumbers={true}
        weekText="Tydz."
        navLinks={true}
        nowIndicator={true}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
      />

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedEvent?.extendedProps.orderNumber}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.extendedProps.externalNumber && (
                <span className="text-muted-foreground">
                  Nr zewnetrzny: {selectedEvent.extendedProps.externalNumber}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge
                  className={`${
                    statusColors[selectedEvent.extendedProps.status]
                  } text-white`}
                >
                  {selectedEvent.extendedProps.statusLabel}
                </Badge>
                {selectedEvent.extendedProps.type === "FORWARDING" && (
                  <Badge variant="outline">Spedycja</Badge>
                )}
              </div>

              <Separator />

              {/* Route */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-green-500" />
                  <div>
                    <p className="font-medium">Zaladunek</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent.extendedProps.originCity ||
                        selectedEvent.extendedProps.origin}
                      {selectedEvent.extendedProps.originCountry !== "PL" &&
                        ` (${selectedEvent.extendedProps.originCountry})`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedEvent.extendedProps.loadingDate)}
                      {formatTime(
                        selectedEvent.extendedProps.loadingTimeFrom,
                        selectedEvent.extendedProps.loadingTimeTo
                      ) && (
                        <span>
                          {" "}
                          {formatTime(
                            selectedEvent.extendedProps.loadingTimeFrom,
                            selectedEvent.extendedProps.loadingTimeTo
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-red-500" />
                  <div>
                    <p className="font-medium">Rozladunek</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent.extendedProps.destinationCity ||
                        selectedEvent.extendedProps.destination}
                      {selectedEvent.extendedProps.destinationCountry !== "PL" &&
                        ` (${selectedEvent.extendedProps.destinationCountry})`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedEvent.extendedProps.unloadingDate)}
                      {formatTime(
                        selectedEvent.extendedProps.unloadingTimeFrom,
                        selectedEvent.extendedProps.unloadingTimeTo
                      ) && (
                        <span>
                          {" "}
                          {formatTime(
                            selectedEvent.extendedProps.unloadingTimeFrom,
                            selectedEvent.extendedProps.unloadingTimeTo
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Assignment */}
              <div className="grid grid-cols-2 gap-4">
                {selectedEvent.extendedProps.driverName && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Kierowca</p>
                      <p className="text-sm font-medium">
                        {selectedEvent.extendedProps.driverName}
                      </p>
                    </div>
                  </div>
                )}

                {selectedEvent.extendedProps.vehicleReg && (
                  <div className="flex items-start gap-2">
                    <Truck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pojazd</p>
                      <p className="text-sm font-medium">
                        {selectedEvent.extendedProps.vehicleReg}
                        {selectedEvent.extendedProps.trailerReg && (
                          <span className="text-muted-foreground">
                            {" "}
                            + {selectedEvent.extendedProps.trailerReg}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {selectedEvent.extendedProps.contractorName && (
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Klient</p>
                      <p className="text-sm font-medium">
                        {selectedEvent.extendedProps.contractorName}
                      </p>
                    </div>
                  </div>
                )}

                {selectedEvent.extendedProps.priceNet && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cena netto</p>
                      <p className="text-sm font-medium">
                        {formatPrice(
                          selectedEvent.extendedProps.priceNet,
                          selectedEvent.extendedProps.currency
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cargo description */}
              {selectedEvent.extendedProps.cargoDescription && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Opis ladunku
                    </p>
                    <p className="text-sm">
                      {selectedEvent.extendedProps.cargoDescription}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Zamknij
                </Button>
                <Button onClick={handleViewDetails}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Zobacz szczegoly
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center pointer-events-none">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
