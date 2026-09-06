import { z } from "zod";
import { QuotationStatus } from "@prisma/client";

const lineItemSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1),
  quantity: z.number().int().nonnegative().default(1),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
  taxPercent: z.number().nonnegative().optional(),
});

export const createQuotationSchema = z.object({
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  serviceName: z.string().min(1).optional(),
  amount: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  status: z.nativeEnum(QuotationStatus).optional(),
  lineItems: z.array(lineItemSchema).optional(),
}).refine((data) => data.customerId || data.leadId, {
  message: "Either customerId or leadId is required",
}).refine((data) => data.lineItems?.length || (data.serviceName && data.amount !== undefined), {
  message: "Either lineItems or serviceName+amount is required",
});

export const updateQuotationSchema = z.object({
  serviceName: z.string().min(1).optional(),
  status: z.nativeEnum(QuotationStatus).optional(),
  lineItems: z.array(lineItemSchema).optional(),
});
