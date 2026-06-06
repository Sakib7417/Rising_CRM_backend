import { z } from "zod";
import { DealStage } from "@prisma/client";

export const createDealSchema = z.object({
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  title: z.string().min(1),
  amount: z.number().nonnegative(),
  stage: z.nativeEnum(DealStage).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  assignedToId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const updateDealSchema = createDealSchema.partial();
