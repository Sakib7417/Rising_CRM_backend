import { z } from "zod";
import { InvoiceStatus } from "@prisma/client";

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  quotationId: z.string().uuid().optional(),
  amount: z.number().nonnegative(),
  tax: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  amount: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
});

export const addPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().datetime().optional(),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});
