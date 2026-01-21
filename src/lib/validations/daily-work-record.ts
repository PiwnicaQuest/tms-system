import { z } from "zod";

export const dailyWorkRecordSchema = z.object({
  date: z.coerce.date(),
  driverId: z.string().min(1, "Kierowca jest wymagany"),
  vehicleId: z.string().min(1, "Pojazd jest wymagany"),
  orderId: z.string().optional(),
  routeDescription: z.string().optional(),
  clientCompany: z.string().optional(),
  revenueShare: z.number().min(0).max(1).default(1),
  allocatedAmount: z.number().min(0),
  workType: z.enum([
    "ROUTE", "LOADING", "UNLOADING", "TRANSFER",
    "STANDBY", "MAINTENANCE", "DAY_OFF", "SICK", "VACATION"
  ]).default("ROUTE"),
  notes: z.string().optional(),
});

export const dailyWorkRecordUpdateSchema = dailyWorkRecordSchema.partial();

// Schema for splitting an order between multiple drivers/vehicles
export const orderAllocationSchema = z.object({
  orderId: z.string(),
  allocations: z.array(z.object({
    driverId: z.string(),
    vehicleId: z.string(),
    revenueShare: z.number().min(0).max(1),
    notes: z.string().optional(),
  })).min(1).refine(
    (allocations) => {
      const totalShare = allocations.reduce((sum, a) => sum + a.revenueShare, 0);
      return Math.abs(totalShare - 1) < 0.001; // Allow small floating point errors
    },
    { message: "Suma udziałów musi wynosić 100%" }
  ),
});

export type DailyWorkRecordInput = z.infer<typeof dailyWorkRecordSchema>;
export type DailyWorkRecordUpdateInput = z.infer<typeof dailyWorkRecordUpdateSchema>;
export type OrderAllocationInput = z.infer<typeof orderAllocationSchema>;
