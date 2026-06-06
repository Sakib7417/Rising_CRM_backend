import { z } from "zod";
import { FollowupStatus } from "@prisma/client";

export const createFollowupSchema = z.object({
  leadId: z.string().uuid(),
  followupDate: z.coerce.date(),
  remarks: z.string().optional(),
  nextFollowupDate: z.coerce.date().optional(),
  followupStatus: z.nativeEnum(FollowupStatus).optional(),
});

export const updateFollowupSchema = z.object({
  followupDate: z.coerce.date().optional(),
  remarks: z.string().optional(),
  nextFollowupDate: z.coerce.date().nullable().optional(),
  followupStatus: z.nativeEnum(FollowupStatus).optional(),
});

export const followupQuerySchema = z.object({
  date: z.coerce.date().optional(),
  withinDays: z.coerce.number().min(1).max(90).optional(),
});
