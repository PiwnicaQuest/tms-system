"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  User,
  Truck,
  Calendar,
  Percent,
  Clock,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { OrderAssignmentDialog } from "./OrderAssignmentDialog";

// Types
type AssignmentReason =
  | "INITIAL"
  | "DRIVER_ILLNESS"
  | "DRIVER_VACATION"
  | "VEHICLE_BREAKDOWN"
  | "VEHICLE_SERVICE"
  | "SCHEDULE_CONFLICT"
  | "CLIENT_REQUEST"
  | "OPTIMIZATION"
  | "OTHER";

const reasonLabels: Record<AssignmentReason, string> = {
  INITIAL: "Pierwsze przypisanie",
  DRIVER_ILLNESS: "Choroba kierowcy",
  DRIVER_VACATION: "Urlop kierowcy",
  VEHICLE_BREAKDOWN: "Awaria pojazdu",
  VEHICLE_SERVICE: "Serwis pojazdu",
  SCHEDULE_CONFLICT: "Konflikt harmonogramu",
  CLIENT_REQUEST: "Na zyczenie klienta",
  OPTIMIZATION: "Optymalizacja trasy",
  OTHER: "Inne",
};

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  brand?: string | null;
  model?: string | null;
}

interface Trailer {
  id: string;
  registrationNumber: string;
  type?: string | null;
}

interface OrderAssignment {
  id: string;
  driverId: string;
  vehicleId: string | null;
  trailerId: string | null;
  startDate: string;
  endDate: string | null;
  revenueShare: number;
  allocatedAmount: number | null;
  distanceKm: number | null;
  reason: AssignmentReason;
  reasonNote: string | null;
  isPrimary: boolean;
  isActive: boolean;
  driver: Driver;
  vehicle: Vehicle | null;
  trailer: Trailer | null;
}

interface AssignmentsSummary {
  total: number;
  active: number;
  completed: number;
  totalRevenueShare: number;
  totalAllocated: number;
  orderPrice: number | null;
  remainingShare: number;
}

interface OrderAssignmentsListProps {
  orderId: string;
  orderLoadingDate: string;
  orderUnloadingDate: string;
  orderPrice: number | null;
  assignments: OrderAssignment[];
  onRefresh?: () => void;
}

export function OrderAssignmentsList({
  orderId,
  orderLoadingDate,
  orderUnloadingDate,
  orderPrice,
  assignments,
  onRefresh,
}: OrderAssignmentsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<OrderAssignment | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<OrderAssignment | null>(null);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [endingAssignment, setEndingAssignment] = useState<OrderAssignment | null>(null);
  const [loading, setLoading] = useState(false);

  // Calculate summary
  const activeAssignments = assignments.filter((a) => a.isActive && !a.endDate);
  const completedAssignments = assignments.filter((a) => a.endDate);
  const totalRevenueShare = activeAssignments.reduce((sum, a) => sum + a.revenueShare, 0);
  const remainingShare = Math.max(0, 1 - totalRevenueShare);
  const totalAllocated = assignments.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0);

  const handleAddClick = () => {
    setEditingAssignment(null);
    setDialogOpen(true);
  };

  const handleEditClick = (assignment: OrderAssignment) => {
    setEditingAssignment(assignment);
    setDialogOpen(true);
  };

  const handleEndClick = (assignment: OrderAssignment) => {
    setEndingAssignment(assignment);
    setEndConfirmOpen(true);
  };

  const handleDeleteClick = (assignment: OrderAssignment) => {
    setDeletingAssignment(assignment);
    setDeleteConfirmOpen(true);
  };

  const handleEndAssignment = async () => {
    if (!endingAssignment) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/orders/${orderId}/assignments/${endingAssignment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "end",
            endDate: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Wystapil blad");
        return;
      }

      toast.success("Przypisanie zostalo zakonczone");
      setEndConfirmOpen(false);
      setEndingAssignment(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error ending assignment:", error);
      toast.error("Wystapil blad");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deletingAssignment) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/orders/${orderId}/assignments/${deletingAssignment.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Wystapil blad");
        return;
      }

      toast.success("Przypisanie zostalo usuniete");
      setDeleteConfirmOpen(false);
      setDeletingAssignment(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Wystapil blad");
    } finally {
      setLoading(false);
    }
  };

  const handleDialogSuccess = () => {
    if (onRefresh) onRefresh();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM yyyy", { locale: pl });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return amount.toLocaleString("pl-PL", {
      style: "currency",
      currency: "PLN",
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Historia przypisań</CardTitle>
            <CardDescription>
              {assignments.length === 0
                ? "Brak przypisanych kierowców"
                : `${activeAssignments.length} aktywnych, ${completedAssignments.length} zakończonych`}
            </CardDescription>
          </div>
          <Button onClick={handleAddClick} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Dodaj
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary */}
          {assignments.length > 0 && (
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-muted-foreground">Łącznie</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {activeAssignments.length}
                </p>
                <p className="text-xs text-muted-foreground">Aktywnych</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(totalRevenueShare * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Przypisane</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{formatCurrency(totalAllocated)}</p>
                <p className="text-xs text-muted-foreground">Alokowane</p>
              </div>
            </div>
          )}

          {/* Active Assignments */}
          {activeAssignments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Aktywne</h4>
              <div className="space-y-2">
                {activeAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                    onEdit={() => handleEditClick(assignment)}
                    onEnd={() => handleEndClick(assignment)}
                    onDelete={() => handleDeleteClick(assignment)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Assignments */}
          {completedAssignments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Zakończone</h4>
              <div className="space-y-2">
                {completedAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                    onEdit={() => handleEditClick(assignment)}
                    onDelete={() => handleDeleteClick(assignment)}
                    isCompleted
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {assignments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Brak przypisanych kierowców do tego zlecenia
              </p>
              <Button onClick={handleAddClick} variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Dodaj pierwsze przypisanie
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <OrderAssignmentDialog
        orderId={orderId}
        orderLoadingDate={orderLoadingDate}
        orderUnloadingDate={orderUnloadingDate}
        orderPrice={orderPrice}
        remainingShare={remainingShare}
        assignment={editingAssignment}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      {/* End Confirmation Dialog */}
      <AlertDialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zakończyć przypisanie?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz zakończyć przypisanie kierowcy{" "}
              <strong>
                {endingAssignment?.driver.firstName} {endingAssignment?.driver.lastName}
              </strong>
              ? Data zakończenia zostanie ustawiona na dzisiaj.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndAssignment} disabled={loading}>
              {loading ? "Kończenie..." : "Zakończ przypisanie"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć przypisanie?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć przypisanie kierowcy{" "}
              <strong>
                {deletingAssignment?.driver.firstName} {deletingAssignment?.driver.lastName}
              </strong>
              ? Ta operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssignment}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Assignment Card Component
interface AssignmentCardProps {
  assignment: OrderAssignment;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number | null) => string;
  onEdit: () => void;
  onEnd?: () => void;
  onDelete: () => void;
  isCompleted?: boolean;
}

function AssignmentCard({
  assignment,
  formatDate,
  formatCurrency,
  onEdit,
  onEnd,
  onDelete,
  isCompleted = false,
}: AssignmentCardProps) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        isCompleted ? "bg-muted/30" : "bg-background"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isCompleted
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            }`}
          >
            <User className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {assignment.driver.firstName} {assignment.driver.lastName}
              </span>
              {assignment.isPrimary && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="mr-1 h-3 w-3" />
                  Główny
                </Badge>
              )}
              {isCompleted && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Zakończone
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {assignment.vehicle && (
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" />
                  {assignment.vehicle.registrationNumber}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(assignment.startDate)}
                {assignment.endDate && ` - ${formatDate(assignment.endDate)}`}
              </span>
              <span className="flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" />
                {Math.round(assignment.revenueShare * 100)}%
              </span>
            </div>
            {assignment.allocatedAmount && (
              <p className="text-sm font-medium text-green-600">
                {formatCurrency(assignment.allocatedAmount)}
              </p>
            )}
            {assignment.reason !== "INITIAL" && (
              <p className="text-xs text-muted-foreground">
                <Clock className="mr-1 inline h-3 w-3" />
                {reasonLabels[assignment.reason]}
                {assignment.reasonNote && `: ${assignment.reasonNote}`}
              </p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edytuj
            </DropdownMenuItem>
            {!isCompleted && onEnd && (
              <DropdownMenuItem onClick={onEnd}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Zakończ
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
