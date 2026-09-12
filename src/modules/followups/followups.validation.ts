import { z } from "zod";
import { FollowupOutcome, FollowupStatus, FollowupType } from "@prisma/client";

export const createFollowupSchema = z.object({
  leadId: z.string().uuid(),
  followupDate: z.coerce.date(),
  followupType: z.nativeEnum(FollowupType).optional(),
  contactPerson: z.string().optional(),
  remarks: z.string().optional(),
  nextFollowupDate: z.coerce.date().optional(),
  outcome: z.nativeEnum(FollowupOutcome).optional(),
  followupStatus: z.nativeEnum(FollowupStatus).optional(),
});

export const updateFollowupSchema = z.object({
  followupDate: z.coerce.date().optional(),
  followupType: z.nativeEnum(FollowupType).optional(),
  contactPerson: z.string().optional(),
  remarks: z.string().optional(),
  nextFollowupDate: z.coerce.date().nullable().optional(),
  outcome: z.nativeEnum(FollowupOutcome).optional(),
  followupStatus: z.nativeEnum(FollowupStatus).optional(),
});

export const followupQuerySchema = z.object({
  date: z.coerce.date().optional(),
  withinDays: z.coerce.number().min(1).max(90).optional(),
  userId: z.string().uuid().optional(),
});
