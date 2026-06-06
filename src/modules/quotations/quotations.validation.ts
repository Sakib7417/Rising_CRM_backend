import { z } from "zod";
import { QuotationStatus } from "@prisma/client";

export const createQuotationSchema = z.object({
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  serviceName: z.string().min(1),
  amount: z.number().nonnegative(),
  tax: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  status: z.nativeEnum(QuotationStatus).optional(),
});

export const updateQuotationSchema = createQuotationSchema.partial();
