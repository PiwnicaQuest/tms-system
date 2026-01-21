import { z } from "zod";

export const driverSchema = z.object({
  firstName: z.string().min(2, "Imię jest wymagane"),
  lastName: z.string().min(2, "Nazwisko jest wymagane"),
  pesel: z.string().length(11).optional().or(z.literal("")),
  dateOfBirth: z.coerce.date().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  employmentType: z.enum(["EMPLOYMENT", "B2B", "CONTRACT"]).default("EMPLOYMENT"),
  employmentDate: z.coerce.date().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.coerce.date().optional(),
  licenseCategories: z.string().optional(),
  adrNumber: z.string().optional(),
  adrExpiry: z.coerce.date().optional(),
  adrClasses: z.string().optional(),
  medicalExpiry: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SICK", "INACTIVE", "TERMINATED"]).default("ACTIVE"),
  notes: z.string().optional(),
});

export const driverUpdateSchema = driverSchema.partial();

export type DriverInput = z.infer<typeof driverSchema>;
export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>;
