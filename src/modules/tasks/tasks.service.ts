import { TaskStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { logActivity } from "../../services/activity.service";
import { emitToUser } from "../../config/socket";
import { notifyUser } from "../../services/notification.service";
import { NotificationChannel } from "@prisma/client";

export async function createTask(
  data: {
    title: string;
    description?: string;
    assignedToId?: string;
    dueDate?: Date;
    priority?: import("@prisma/client").TaskPriority;
    status?: TaskStatus;
  },
  createdById: string,
) {
  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      assignedToId: data.assignedToId,
      dueDate: data.dueDate,
      priority: data.priority,
      status: data.status,
      createdById,
    },
  });
  await logActivity({ userId: createdById, action: "TASK_CREATED", entityType: "TASK", entityId: task.id });
  if (task.assignedToId) {
    emitToUser(task.assignedToId, "task:alert", { taskId: task.id, title: task.title });
    await notifyUser({
      userId: task.assignedToId,
      channel: NotificationChannel.BROWSER,
      title: "New task assigned",
      body: task.title,
      socketEvent: "notification:task",
      socketPayload: { taskId: task.id },
    });
  }
  return task;
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    assignedToId: string | null;
    dueDate: Date | null;
    priority: import("@prisma/client").TaskPriority;
    status: TaskStatus;
  }>,
  userId: string,
) {
  const task = await prisma.task.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      assignedToId: data.assignedToId === null ? null : data.assignedToId,
      dueDate: data.dueDate,
      priority: data.priority,
      status: data.status,
    },
  });
  await logActivity({ userId, action: "TASK_UPDATED", entityType: "TASK", entityId: id });
  return task;
}

export async function deleteTask(id: string, userId: string) {
  await prisma.task.delete({ where: { id } });
  await logActivity({ userId, action: "TASK_DELETED", entityType: "TASK", entityId: id });
}

export async function listTasks(filters?: { assignedToId?: string; status?: TaskStatus }) {
  return prisma.task.findMany({
    where: {
      assignedToId: filters?.assignedToId,
      status: filters?.status,
    },
    orderBy: { dueDate: "asc" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}
