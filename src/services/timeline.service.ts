import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";

export async function addLeadTimeline(input: {
  leadId: string;
  userId?: string | null;
  action: string;
  remarks?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.leadTimelineEvent.create({
    data: {
      leadId: input.leadId,
      userId: input.userId ?? undefined,
      action: input.action,
      remarks: input.remarks ?? undefined,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function listLeadTimeline(leadId: string) {
  return prisma.leadTimelineEvent.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}
