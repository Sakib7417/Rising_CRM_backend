import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import bcrypt from "bcryptjs";
import { UserRole, Prisma } from "@prisma/client";
import { logActivity } from "../../services/activity.service";

const SALT = 12;

export async function listUsers(filters?: { role?: UserRole; isActive?: boolean }) {
  return prisma.user.findMany({
    where: {
      role: filters?.role,
      isActive: filters?.isActive,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      profileImage: true,
      targetAmount: true,
      achievedAmount: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      profileImage: true,
      targetAmount: true,
      achievedAmount: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
}

export async function createUser(
  data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: UserRole;
    targetAmount?: number;
    profileImage?: string;
  },
  actorId: string,
) {
  const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (exists) {
    throw new AppError("Email already in use", 409);
  }
  const password = await bcrypt.hash(data.password, SALT);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      password,
      role: data.role,
      targetAmount: data.targetAmount !== undefined ? new Prisma.Decimal(data.targetAmount) : undefined,
      profileImage: data.profileImage || undefined,
    },
  });
  await logActivity({
    userId: actorId,
    action: "USER_CREATED",
    entityType: "USER",
    entityId: user.id,
  });
  return getUserById(user.id);
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    phone?: string | null;
    role?: UserRole;
    profileImage?: string | null;
    targetAmount?: number | null;
    achievedAmount?: number;
    isActive?: boolean;
  },
  actorId: string,
) {
  await getUserById(id);
  const user = await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone ?? undefined,
      role: data.role,
      profileImage: data.profileImage === "" ? null : data.profileImage,
      targetAmount:
        data.targetAmount === null
          ? null
          : data.targetAmount !== undefined
            ? new Prisma.Decimal(data.targetAmount)
            : undefined,
      achievedAmount:
        data.achievedAmount !== undefined ? new Prisma.Decimal(data.achievedAmount) : undefined,
      isActive: data.isActive,
    },
  });
  await logActivity({
    userId: actorId,
    action: "USER_UPDATED",
    entityType: "USER",
    entityId: id,
  });
  return getUserById(user.id);
}

export async function deleteUser(id: string, actorId: string) {
  await getUserById(id);
  await prisma.user.delete({ where: { id } });
  await logActivity({
    userId: actorId,
    action: "USER_DELETED",
    entityType: "USER",
    entityId: id,
  });
}

export async function assignLeadsToUser(userId: string, leadIds: string[], actorId: string) {
  await getUserById(userId);
  await prisma.lead.updateMany({
    where: { id: { in: leadIds } },
    data: { assignedToId: userId },
  });
  for (const leadId of leadIds) {
    await logActivity({
      userId: actorId,
      action: "LEADS_ASSIGNED",
      entityType: "LEAD",
      entityId: leadId,
      metadata: { assignedToId: userId },
    });
  }
  return { assigned: leadIds.length };
}

export async function employeePerformance(userId: string) {
  await getUserById(userId);
  const [leadsAssigned, dealsWon, revenue, tasksDone] = await Promise.all([
    prisma.lead.count({ where: { assignedToId: userId } }),
    prisma.deal.count({ where: { assignedToId: userId, stage: "WON" } }),
    prisma.deal.aggregate({
      where: { assignedToId: userId, stage: "WON" },
      _sum: { amount: true },
    }),
    prisma.task.count({ where: { assignedToId: userId, status: "COMPLETED" } }),
  ]);
  return {
    leadsAssigned,
    dealsWon,
    revenue: revenue._sum.amount?.toString() ?? "0",
    tasksCompleted: tasksDone,
  };
}
