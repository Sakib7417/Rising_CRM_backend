import { z } from "zod";

export const createNoteSchema = z.object({
  leadId: z.string().uuid(),
  note: z.string().min(1),
});
