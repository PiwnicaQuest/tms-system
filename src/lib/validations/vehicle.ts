import { z } from "zod";

export const vehicleSchema = z.object({
  registrationNumber: z.string().min(3, "Nr rejestracyjny jest wymagany").max(15),
  type: z.enum(["TRUCK", "BUS", "SOLO", "TRAILER", "CAR"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  vin: z.string().optional(),
  year: z.number().min(1990).max(new Date().getFullYear() + 1).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "IN_SERVICE", "SOLD"]).default("ACTIVE"),
  loadCapacity: z.number().positive().optional(),
  volume: z.number().positive().optional(),
  euroClass: z.string().optional(),
  fuelType: z.enum(["DIESEL", "PETROL", "LPG", "ELECTRIC", "HYBRID"]).optional(),
  notes: z.string().optional(),
});

export const vehicleUpdateSchema = vehicleSchema.partial();

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
