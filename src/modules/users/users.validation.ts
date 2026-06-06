import { z } from "zod";
import { UserRole } from "@prisma/client";

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  targetAmount: z.number().nonnegative().optional(),
  profileImage: z.string().url().optional().or(z.literal("")),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(UserRole).optional(),
  profileImage: z.string().optional().nullable(),
  targetAmount: z.number().nonnegative().optional().nullable(),
  achievedAmount: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const assignLeadsSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
});
