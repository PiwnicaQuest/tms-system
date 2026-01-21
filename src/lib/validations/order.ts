import { z } from "zod";

export const orderSchema = z.object({
  externalNumber: z.string().optional(),
  type: z.enum(["OWN", "FORWARDING"]).default("OWN"),
  status: z.enum([
    "PLANNED", "ASSIGNED", "CONFIRMED", "LOADING",
    "IN_TRANSIT", "UNLOADING", "COMPLETED", "CANCELLED", "PROBLEM"
  ]).default("PLANNED"),
  contractorId: z.string().optional(),
  subcontractorId: z.string().optional(),
  vehicleId: z.string().optional(),
  trailerId: z.string().optional(),
  driverId: z.string().optional(),
  origin: z.string().min(1, "Miejsce załadunku jest wymagane"),
  originCity: z.string().optional(),
  originCountry: z.string().default("PL"),
  destination: z.string().min(1, "Miejsce rozładunku jest wymagane"),
  destinationCity: z.string().optional(),
  destinationCountry: z.string().default("PL"),
  distanceKm: z.number().positive().optional(),
  loadingDate: z.coerce.date(),
  loadingTimeFrom: z.string().optional(),
  loadingTimeTo: z.string().optional(),
  unloadingDate: z.coerce.date(),
  unloadingTimeFrom: z.string().optional(),
  unloadingTimeTo: z.string().optional(),
  cargoDescription: z.string().optional(),
  cargoWeight: z.number().positive().optional(),
  cargoVolume: z.number().positive().optional(),
  cargoPallets: z.number().int().positive().optional(),
  cargoValue: z.number().positive().optional(),
  requiresAdr: z.boolean().default(false),
  priceNet: z.number().positive().optional(),
  currency: z.string().default("PLN"),
  costNet: z.number().positive().optional(),
  flatRateKm: z.number().positive().optional(),
  kmLimit: z.number().positive().optional(),
  kmOverageRate: z.number().positive().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const orderUpdateSchema = orderSchema.partial();
export const orderStatusSchema = z.object({
  status: z.enum([
    "PLANNED", "ASSIGNED", "CONFIRMED", "LOADING",
    "IN_TRANSIT", "UNLOADING", "COMPLETED", "CANCELLED", "PROBLEM"
  ]),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;

// ==================== ORDER ASSIGNMENT SCHEMAS ====================

export const assignmentReasonEnum = z.enum([
  "INITIAL",
  "DRIVER_ILLNESS",
  "DRIVER_VACATION",
  "VEHICLE_BREAKDOWN",
  "VEHICLE_SERVICE",
  "SCHEDULE_CONFLICT",
  "CLIENT_REQUEST",
  "OPTIMIZATION",
  "OTHER",
]);

export const orderAssignmentSchema = z.object({
  driverId: z.string().min(1, "Kierowca jest wymagany"),
  vehicleId: z.string().optional(),
  trailerId: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  revenueShare: z.number().min(0).max(1).default(1.0),
  allocatedAmount: z.number().optional().nullable(),
  distanceKm: z.number().positive().optional().nullable(),
  reason: assignmentReasonEnum.default("INITIAL"),
  reasonNote: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const orderAssignmentUpdateSchema = orderAssignmentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const endAssignmentSchema = z.object({
  endDate: z.coerce.date(),
  reason: assignmentReasonEnum.optional(),
  reasonNote: z.string().optional(),
});

export type OrderAssignmentInput = z.infer<typeof orderAssignmentSchema>;
export type OrderAssignmentUpdateInput = z.infer<typeof orderAssignmentUpdateSchema>;
export type AssignmentReason = z.infer<typeof assignmentReasonEnum>;
