import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Opis jest wymagany"),
  quantity: z.number().positive().default(1),
  unit: z.string().default("szt."),
  unitPriceNet: z.number().min(0),
  vatRate: z.number().min(0).max(100).default(23),
});

export const invoiceSchema = z.object({
  type: z.enum(["SINGLE", "COLLECTIVE", "PROFORMA", "CORRECTION"]).default("SINGLE"),
  contractorId: z.string().min(1, "Kontrahent jest wymagany"),
  issueDate: z.coerce.date(),
  saleDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  paymentMethod: z.enum(["TRANSFER", "CASH", "CARD"]).default("TRANSFER"),
  bankAccount: z.string().optional(),
  currency: z.string().default("PLN"),
  // Exchange rate fields (for non-PLN invoices)
  exchangeRate: z.number().positive().optional(),
  exchangeRateDate: z.coerce.date().optional(),
  exchangeRateTable: z.string().optional(),
  amountInPLN: z.number().positive().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Faktura musi zawierać co najmniej jedną pozycję"),
  orderIds: z.array(z.string()).optional(), // For collective invoices
});

export const invoiceUpdateSchema = invoiceSchema.partial();

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
