import { NotificationChannel } from "@prisma/client";
import { prisma } from "../config/db";
import { emitToUser } from "../config/socket";

export async function notifyUser(input: {
  userId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  socketEvent?: string;
  socketPayload?: unknown;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      channel: input.channel,
      title: input.title,
      body: input.body,
    },
  });
  if (input.channel === NotificationChannel.BROWSER && input.socketEvent) {
    emitToUser(input.userId, input.socketEvent, input.socketPayload ?? { title: input.title, body: input.body });
  }
}

export async function listNotifications(userId: string, unreadOnly?: boolean) {
  return prisma.notification.findMany({
    where: { userId, readAt: unreadOnly ? null : undefined },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}
