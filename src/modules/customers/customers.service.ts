import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../services/activity.service";

export async function listCustomers() {
  return prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { lead: { select: { id: true, name: true, leadStatus: true } } },
  });
}

export async function getCustomer(id: string) {
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      lead: true,
      deals: true,
      quotations: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!c) {
    throw new AppError("Customer not found", 404);
  }
  return c;
}

export async function createCustomer(
  data: {
    name: string;
    phone?: string;
    email?: string;
    companyName?: string;
    address?: string;
    purchasedService?: string;
    totalDealAmount?: number;
    notes?: string;
    leadId?: string;
  },
  userId: string,
) {
  const c = await prisma.customer.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      companyName: data.companyName,
      address: data.address,
      purchasedService: data.purchasedService,
      totalDealAmount: data.totalDealAmount !== undefined ? new Prisma.Decimal(data.totalDealAmount) : undefined,
      notes: data.notes,
      leadId: data.leadId,
    },
  });
  await logActivity({ userId, action: "CUSTOMER_CREATED", entityType: "CUSTOMER", entityId: c.id });
  return c;
}

export async function addCustomerNote(id: string, note: string, userId: string) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Customer not found", 404);
  }
  const merged = [existing.notes, note].filter(Boolean).join("\n---\n");
  const c = await prisma.customer.update({
    where: { id },
    data: { notes: merged },
  });
  await logActivity({ userId, action: "CUSTOMER_NOTE", entityType: "CUSTOMER", entityId: id, remarks: note });
  return c;
}
