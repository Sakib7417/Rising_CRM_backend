import { FollowupStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { addLeadTimeline } from "../../services/timeline.service";
import { logActivity } from "../../services/activity.service";
import { emitToUser } from "../../config/socket";
import { notifyUser } from "../../services/notification.service";
import { NotificationChannel } from "@prisma/client";

export async function addFollowup(input: {
  leadId: string;
  followupDate: Date;
  remarks?: string;
  nextFollowupDate?: Date;
  followupStatus?: FollowupStatus;
  createdById: string;
}) {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) {
    throw new AppError("Lead not found", 404);
  }
  const followup = await prisma.followup.create({
    data: {
      leadId: input.leadId,
      followupDate: input.followupDate,
      remarks: input.remarks,
      nextFollowupDate: input.nextFollowupDate,
      followupStatus: input.followupStatus ?? FollowupStatus.PENDING,
      createdById: input.createdById,
    },
  });
  await prisma.lead.update({
    where: { id: input.leadId },
    data: {
      lastContactDate: new Date(),
      ...(input.nextFollowupDate ? { nextFollowupDate: input.nextFollowupDate } : {}),
    },
  });
  await addLeadTimeline({
    leadId: input.leadId,
    userId: input.createdById,
    action: "FOLLOWUP_ADDED",
    remarks: input.remarks,
  });
  await logActivity({
    userId: input.createdById,
    action: "FOLLOWUP_ADDED",
    entityType: "LEAD",
    entityId: input.leadId,
  });
  if (lead.assignedToId) {
    emitToUser(lead.assignedToId, "followup:reminder", { followupId: followup.id, leadId: lead.id });
    await notifyUser({
      userId: lead.assignedToId,
      channel: NotificationChannel.BROWSER,
      title: "Follow-up logged",
      body: `Follow-up added for lead ${lead.name}`,
      socketEvent: "notification:followup",
      socketPayload: { followupId: followup.id },
    });
  }
  return followup;
}

export async function updateFollowup(
  id: string,
  data: Partial<{
    followupDate: Date;
    remarks: string;
    nextFollowupDate: Date | null;
    followupStatus: FollowupStatus;
  }>,
  userId: string,
) {
  const existing = await prisma.followup.findUnique({ where: { id }, include: { lead: true } });
  if (!existing) {
    throw new AppError("Followup not found", 404);
  }
  const followup = await prisma.followup.update({
    where: { id },
    data: {
      followupDate: data.followupDate,
      remarks: data.remarks,
      nextFollowupDate: data.nextFollowupDate,
      followupStatus: data.followupStatus,
    },
  });
  await addLeadTimeline({
    leadId: existing.leadId,
    userId,
    action: "FOLLOWUP_UPDATED",
    remarks: data.remarks,
  });
  return followup;
}

export async function deleteFollowup(id: string, userId: string) {
  const existing = await prisma.followup.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Followup not found", 404);
  }
  await prisma.followup.delete({ where: { id } });
  await addLeadTimeline({ leadId: existing.leadId, userId, action: "FOLLOWUP_DELETED" });
}

export async function listFollowupsForLead(leadId: string) {
  return prisma.followup.findMany({
    where: { leadId },
    orderBy: { followupDate: "desc" },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });
}

export async function dailyFollowups(date: Date, userId?: string) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return prisma.followup.findMany({
    where: {
      followupDate: { gte: start, lte: end },
      followupStatus: FollowupStatus.PENDING,
      lead: userId ? { assignedToId: userId } : undefined,
    },
    include: { lead: true, createdBy: { select: { id: true, name: true } } },
  });
}

export async function missedFollowups(userId?: string) {
  const now = new Date();
  return prisma.followup.findMany({
    where: {
      followupStatus: FollowupStatus.PENDING,
      followupDate: { lt: now },
      lead: userId ? { assignedToId: userId } : undefined,
    },
    orderBy: { followupDate: "asc" },
    include: { lead: true },
  });
}

export async function upcomingFollowups(withinDays: number, userId?: string) {
  const now = new Date();
  const until = new Date(now.getTime() + withinDays * 86400000);
  return prisma.followup.findMany({
    where: {
      followupStatus: FollowupStatus.PENDING,
      followupDate: { gte: now, lte: until },
      lead: userId ? { assignedToId: userId } : undefined,
    },
    include: { lead: true },
  });
}
