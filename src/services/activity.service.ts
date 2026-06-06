import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";

type LogInput = {
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  remarks?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function logActivity(input: LogInput): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId: input.userId ?? undefined,
      action: input.action,
      entityType: input.entityType ?? undefined,
      entityId: input.entityId ?? undefined,
      remarks: input.remarks ?? undefined,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined,
    },
  });
}
