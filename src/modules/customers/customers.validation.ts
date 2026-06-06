import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  companyName: z.string().optional(),
  address: z.string().optional(),
  purchasedService: z.string().optional(),
  totalDealAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  leadId: z.string().uuid().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
