import { DealStage, Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../services/activity.service";
import { emitBroadcast } from "../../config/socket";
import { notifyUser } from "../../services/notification.service";
import { NotificationChannel } from "@prisma/client";

export async function createDeal(
  data: {
    customerId?: string;
    leadId?: string;
    title: string;
    amount: number;
    stage?: DealStage;
    expectedCloseDate?: Date;
    assignedToId?: string;
    notes?: string;
  },
  userId: string,
) {
  const deal = await prisma.deal.create({
    data: {
      customerId: data.customerId,
      leadId: data.leadId,
      title: data.title,
      amount: new Prisma.Decimal(data.amount),
      stage: data.stage ?? DealStage.NEW,
      expectedCloseDate: data.expectedCloseDate,
      assignedToId: data.assignedToId,
      notes: data.notes,
    },
  });
  await logActivity({ userId, action: "DEAL_CREATED", entityType: "DEAL", entityId: deal.id });
  emitBroadcast("deal:updated", { dealId: deal.id, stage: deal.stage });
  if (deal.assignedToId) {
    await notifyUser({
      userId: deal.assignedToId,
      channel: NotificationChannel.BROWSER,
      title: "New deal",
      body: deal.title,
      socketEvent: "notification:deal",
      socketPayload: { dealId: deal.id },
    });
  }
  return deal;
}

export async function updateDeal(
  id: string,
  data: Partial<{
    title: string;
    amount: number;
    stage: DealStage;
    expectedCloseDate: Date | null;
    assignedToId: string | null;
    notes: string;
  }>,
  userId: string,
) {
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Deal not found", 404);
  }
  const deal = await prisma.deal.update({
    where: { id },
    data: {
      title: data.title,
      amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
      stage: data.stage,
      expectedCloseDate: data.expectedCloseDate,
      assignedToId: data.assignedToId,
      notes: data.notes,
    },
  });
  if (data.stage === DealStage.WON && existing.stage !== DealStage.WON && deal.assignedToId) {
    await prisma.user.update({
      where: { id: deal.assignedToId },
      data: {
        achievedAmount: { increment: deal.amount },
      },
    });
  }
  await logActivity({ userId, action: "DEAL_UPDATED", entityType: "DEAL", entityId: id });
  emitBroadcast("deal:updated", { dealId: deal.id, stage: deal.stage });
  return deal;
}

export async function listDeals(filters?: { stage?: DealStage; assignedToId?: string }) {
  return prisma.deal.findMany({
    where: {
      stage: filters?.stage,
      assignedToId: filters?.assignedToId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, companyName: true } },
      lead: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function pipeline() {
  const deals = await prisma.deal.findMany({
    where: { stage: { notIn: [DealStage.WON, DealStage.LOST] } },
    include: { customer: true, assignedTo: { select: { id: true, name: true } } },
  });
  const grouped: Record<string, typeof deals> = {};
  for (const stage of Object.values(DealStage)) {
    grouped[stage] = deals.filter((d) => d.stage === stage);
  }
  return grouped;
}

export async function dealAnalytics() {
  const [won, lost, open] = await Promise.all([
    prisma.deal.aggregate({ where: { stage: DealStage.WON }, _sum: { amount: true }, _count: true }),
    prisma.deal.count({ where: { stage: DealStage.LOST } }),
    prisma.deal.count({ where: { stage: { notIn: [DealStage.WON, DealStage.LOST] } } }),
  ]);
  return {
    wonCount: won._count,
    wonRevenue: won._sum.amount?.toString() ?? "0",
    lostCount: lost,
    openCount: open,
  };
}
