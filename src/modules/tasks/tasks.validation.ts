import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();
