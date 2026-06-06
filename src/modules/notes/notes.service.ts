import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { addLeadTimeline } from "../../services/timeline.service";
import { logActivity } from "../../services/activity.service";

export async function addNote(leadId: string, userId: string, note: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new AppError("Lead not found", 404);
  }
  const n = await prisma.note.create({
    data: { leadId, userId, note },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  await addLeadTimeline({ leadId, userId, action: "NOTE_ADDED", remarks: note });
  await logActivity({ userId, action: "NOTE_ADDED", entityType: "LEAD", entityId: leadId });
  return n;
}

export async function listNotes(leadId: string) {
  return prisma.note.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}
