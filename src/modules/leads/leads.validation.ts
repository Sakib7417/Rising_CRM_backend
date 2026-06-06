import { z } from "zod";
import { LeadSource, LeadStatus } from "@prisma/client";
import { paginationQuerySchema } from "../../utils/pagination";

export const createLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  companyName: z.string().optional(),
  serviceRequired: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  leadSource: z.nativeEnum(LeadSource),
  leadStatus: z.nativeEnum(LeadStatus).optional(),
  assignedToId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  nextFollowupDate: z.coerce.date().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const leadListQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  leadStatus: z.nativeEnum(LeadStatus).optional(),
  leadSource: z.nativeEnum(LeadSource).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  assignedToId: z.string().uuid().optional(),
  city: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const importIndiaMartSchema = z.object({
  rawText: z.string().min(1),
});

export const bulkAssignSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  assignedToId: z.string().uuid(),
});

export const assignLeadBodySchema = z.object({
  assignedToId: z.string().uuid(),
});

export const changeStatusSchema = z.object({
  leadStatus: z.nativeEnum(LeadStatus),
  remarks: z.string().optional(),
});

export const toggleActiveSchema = z.object({
  isActive: z.boolean(),
  remarks: z.string().optional(),
});
