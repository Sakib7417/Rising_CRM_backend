import { prisma } from "../../config/db";

export async function listActivities(filters?: {
  userId?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
}) {
  return prisma.activityLog.findMany({
    where: {
      userId: filters?.userId,
      entityType: filters?.entityType,
      createdAt:
        filters?.from || filters?.to
          ? { gte: filters?.from, lte: filters?.to }
          : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}
