import { FollowupStatus, FollowupType, LeadPriority, LeadSource, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../services/activity.service";
import { addLeadTimeline } from "../../services/timeline.service";
import { parseIndiaMartLeadText } from "./indiamart.parser";
import { emitBroadcast, emitToUser } from "../../config/socket";
import { notifyUser } from "../../services/notification.service";
import { NotificationChannel } from "@prisma/client";
import type { PaginationQuery } from "../../utils/pagination";

function decimal(n?: number) {
  return n === undefined ? undefined : new Prisma.Decimal(n);
}

export async function createLead(
  data: {
    name: string;
    phone?: string;
    alternatePhone?: string;
    email?: string;
    companyName?: string;
    serviceRequired?: string;
    budget?: number;
    country?: string;
    state?: string;
    city?: string;
    address?: string;
    leadSource: LeadSource;
    leadStatus?: LeadStatus;
    priority?: LeadPriority;
    assignedToId?: string;
    tags?: string[];
    notes?: string;
    nextFollowupDate?: Date;
    leadDate?: Date;
    followupRemarks?: string;
  },
  createdById: string,
) {
  const duplicate = await prisma.lead.findFirst({
    where: {
      OR: [
        data.phone ? { phone: data.phone } : undefined,
        data.email ? { email: data.email.toLowerCase() } : undefined,
      ].filter(Boolean) as any[],
    },
  });
  if (duplicate) {
    throw new AppError("Duplicate lead found", 409, {
      existingLeadName: duplicate.name,
      mobileNumber: duplicate.phone,
      email: duplicate.email,
      currentStatus: duplicate.leadStatus,
      leadId: duplicate.id,
    });
  }

  const lead = await prisma.lead.create({
    data: {
      name: data.name,
      phone: data.phone,
      alternatePhone: data.alternatePhone,
      email: data.email?.toLowerCase() || undefined,
      companyName: data.companyName,
      serviceRequired: data.serviceRequired,
      budget: decimal(data.budget),
      country: data.country,
      state: data.state,
      city: data.city,
      address: data.address,
      leadSource: data.leadSource,
      leadStatus: data.leadStatus ?? LeadStatus.NEW,
      priority: data.priority ?? LeadPriority.MEDIUM,
      assignedToId: data.assignedToId,
      createdById,
      tags: data.tags ?? [],
      notes: data.notes,
      nextFollowupDate: data.nextFollowupDate,
      leadDate: data.leadDate,
    },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  if (data.nextFollowupDate) {
    await prisma.followup.create({
      data: {
        leadId: lead.id,
        followupDate: data.nextFollowupDate,
        followupType: FollowupType.PHONE_CALL,
        followupStatus: FollowupStatus.PENDING,
        createdById,
        remarks: data.followupRemarks || "Initial follow-up scheduled",
      },
    });
  }

  await addLeadTimeline({
    leadId: lead.id,
    userId: createdById,
    action: "LEAD_CREATED",
    remarks: "Lead created",
  });
  await logActivity({
    userId: createdById,
    action: "LEAD_CREATED",
    entityType: "LEAD",
    entityId: lead.id,
  });
  emitBroadcast("lead:created", { leadId: lead.id, name: lead.name });
  if (lead.assignedToId) {
    await notifyUser({
      userId: lead.assignedToId,
      channel: NotificationChannel.BROWSER,
      title: "New lead assigned",
      body: `Lead ${lead.name} assigned to you`,
      socketEvent: "notification:lead",
      socketPayload: { leadId: lead.id },
    });
  }
  return lead;
}

export async function importIndiaMartLead(rawText: string, createdById: string) {
  const parsed = parseIndiaMartLeadText(rawText);
  if (!parsed.name || !parsed.phone) {
    throw new AppError("Could not parse name or phone from IndiaMART text", 400);
  }
  return createLead(
    {
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      companyName: parsed.companyName,
      serviceRequired: parsed.serviceRequired,
      city: parsed.city,
      state: parsed.state,
      country: parsed.country ?? "India",
      leadSource: LeadSource.INDIAMART,
      leadStatus: LeadStatus.NEW,
      notes: `Imported from IndiaMART paste`,
    },
    createdById,
  );
}

export async function updateLead(
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    alternatePhone: string;
    email: string;
    companyName: string;
    serviceRequired: string;
    budget: number;
    country: string;
    state: string;
    city: string;
    address: string;
    leadSource: LeadSource;
    leadStatus: LeadStatus;
    priority: LeadPriority;
    assignedToId: string | null;
    tags: string[];
    notes: string;
    lastContactDate: Date;
    nextFollowupDate: Date | null;
    leadDate: Date | null;
    isActive: boolean;
  }>,
  userId: string,
) {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Lead not found", 404);
  }
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      alternatePhone: data.alternatePhone,
      email: data.email?.toLowerCase(),
      companyName: data.companyName,
      serviceRequired: data.serviceRequired,
      budget: data.budget !== undefined ? decimal(data.budget) : undefined,
      country: data.country,
      state: data.state,
      city: data.city,
      address: data.address,
      leadSource: data.leadSource,
      leadStatus: data.leadStatus,
      priority: data.priority,
      assignedToId: data.assignedToId === null ? null : data.assignedToId,
      tags: data.tags,
      notes: data.notes,
      lastContactDate: data.lastContactDate,
      nextFollowupDate: data.nextFollowupDate,
      leadDate: data.leadDate,
      isActive: data.isActive,
    },
  });
  await addLeadTimeline({
    leadId: id,
    userId,
    action: "LEAD_UPDATED",
    remarks: "Lead updated",
    metadata: { fields: Object.keys(data) },
  });
  await logActivity({ userId, action: "LEAD_UPDATED", entityType: "LEAD", entityId: id });
  return lead;
}

export async function deleteLead(id: string, userId: string) {
  await prisma.lead.delete({ where: { id } });
  await logActivity({ userId, action: "LEAD_DELETED", entityType: "LEAD", entityId: id });
}

export async function assignLead(id: string, assignedToId: string | null, userId: string) {
  const lead = await prisma.lead.update({
    where: { id },
    data: { assignedToId },
  });
  await addLeadTimeline({
    leadId: id,
    userId,
    action: "LEAD_ASSIGNED",
    remarks: assignedToId ? `Assigned to ${assignedToId}` : "Unassigned",
  });
  await logActivity({ userId, action: "LEAD_ASSIGNED", entityType: "LEAD", entityId: id });
  if (assignedToId) {
    emitToUser(assignedToId, "lead:assigned", { leadId: id });
    await notifyUser({
      userId: assignedToId,
      channel: NotificationChannel.BROWSER,
      title: "Lead assigned",
      body: `You were assigned lead ${lead.name}`,
      socketEvent: "notification:lead",
      socketPayload: { leadId: id },
    });
  }
  return lead;
}

export async function bulkAssignLeads(leadIds: string[], assignedToId: string, userId: string) {
  for (const id of leadIds) {
    await assignLead(id, assignedToId, userId);
  }
  return { updated: leadIds.length };
}

export async function changeLeadStatus(id: string, leadStatus: LeadStatus, userId: string, remarks?: string) {
  const lead = await prisma.lead.update({
    where: { id },
    data: { leadStatus, lastContactDate: new Date() },
  });
  await addLeadTimeline({
    leadId: id,
    userId,
    action: "STATUS_CHANGED",
    remarks: remarks ?? `Status set to ${leadStatus}`,
    metadata: { leadStatus },
  });
  await logActivity({ userId, action: "LEAD_STATUS_CHANGED", entityType: "LEAD", entityId: id, remarks: leadStatus });
  return lead;
}

export async function setLeadActive(id: string, isActive: boolean, userId: string, remarks?: string) {
  const lead = await prisma.lead.update({
    where: { id },
    data: { isActive },
  });
  await addLeadTimeline({
    leadId: id,
    userId,
    action: isActive ? "LEAD_ACTIVATED" : "LEAD_DEACTIVATED",
    remarks,
  });
  return lead;
}

export async function listLeads(
  query: PaginationQuery & {
    search?: string;
    leadStatus?: LeadStatus;
    leadSource?: LeadSource;
    isActive?: boolean;
    assignedToId?: string;
    city?: string;
    fromDate?: Date;
    toDate?: Date;
  },
  userScope?: { id: string; role: string },
) {
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  const where: Prisma.LeadWhereInput = {
    leadStatus: query.leadStatus,
    leadSource: query.leadSource,
    isActive: query.isActive,
    assignedToId: query.assignedToId,
    city: query.city ? { contains: query.city, mode: "insensitive" } : undefined,
    createdAt:
      query.fromDate || query.toDate
        ? {
            gte: query.fromDate,
            lte: query.toDate,
          }
        : undefined,
    OR: query.search
      ? [
          { name: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search.replace(/\D/g, ""), mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
          { companyName: { contains: query.search, mode: "insensitive" } },
        ]
      : undefined,
  };

  if (userScope?.role === "SALES_AGENT" || userScope?.role === "EMPLOYEE") {
    where.assignedToId = userScope.id;
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getLead(id: string, userScope?: { id: string; role: string }) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, phone: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!lead) {
    throw new AppError("Lead not found", 404);
  }
  if (
    (userScope?.role === "SALES_AGENT" || userScope?.role === "EMPLOYEE") &&
    lead.assignedToId !== userScope.id
  ) {
    throw new AppError("Forbidden", 403);
  }
  return lead;
}

export async function convertLeadToCustomer(leadId: string, userId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new AppError("Lead not found", 404);
  }
  if (lead.convertedAt) {
    throw new AppError("Lead already converted", 400);
  }
  const customer = await prisma.$transaction(async (tx) => {
    const c = await tx.customer.create({
      data: {
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email ?? undefined,
        companyName: lead.companyName ?? undefined,
        address: lead.address ?? undefined,
        purchasedService: lead.serviceRequired ?? undefined,
        notes: lead.notes ?? undefined,
      },
    });
    await tx.lead.update({
      where: { id: leadId },
      data: {
        convertedAt: new Date(),
        leadStatus: LeadStatus.CLOSED,
        isActive: false,
      },
    });
    return c;
  });
  await addLeadTimeline({
    leadId,
    userId,
    action: "CONVERTED_TO_CUSTOMER",
    remarks: `Customer ${customer.id} created`,
  });
  await logActivity({
    userId,
    action: "LEAD_CONVERTED",
    entityType: "CUSTOMER",
    entityId: customer.id,
  });
  return customer;
}

function normalizeRowValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function mapLeadSource(value?: string): LeadSource {
  if (!value) return LeadSource.MANUAL;
  const normalized = value.trim().toUpperCase();
  if (normalized.includes("INDIA")) return LeadSource.INDIAMART;
  if (normalized.includes("WEBSITE")) return LeadSource.WEBSITE;
  if (normalized.includes("FACEBOOK")) return LeadSource.FACEBOOK;
  if (normalized.includes("INSTAGRAM")) return LeadSource.INSTAGRAM;
  if (normalized.includes("GOOGLE")) return LeadSource.GOOGLE;
  if (normalized.includes("WHATSAPP")) return LeadSource.WHATSAPP;
  if (normalized.includes("REFERRAL")) return LeadSource.REFERRAL;
  return LeadSource.OTHER;
}

function mapPriority(value?: string) {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (normalized.includes("URGENT")) return LeadPriority.URGENT;
  if (normalized.includes("HIGH")) return LeadPriority.HIGH;
  if (normalized.includes("LOW")) return LeadPriority.LOW;
  return LeadPriority.MEDIUM;
}

export async function bulkCreateLeadsFromRows(
  rows: Record<string, string>[],
  createdById: string,
  defaultSource: LeadSource = LeadSource.MANUAL,
  fileName?: string,
) {
  const stats = {
    totalRows: rows.length,
    importedRows: 0,
    duplicateRows: 0,
    failedRows: 0,
    errors: [] as string[],
  };

  for (const [index, row] of rows.entries()) {
    const name = normalizeRowValue(row, ["name", "Name", "Lead Name", "lead_name"]);
    if (!name) {
      stats.failedRows += 1;
      stats.errors.push(`Row ${index + 1}: missing lead name`);
      continue;
    }

    const phone = normalizeRowValue(row, ["phone", "Phone", "Mobile", "mobile"]);
    const email = normalizeRowValue(row, ["email", "Email"]);
    const companyName = normalizeRowValue(row, ["companyName", "CompanyName", "Company", "company"]);
    const city = normalizeRowValue(row, ["city", "City"]);
    const state = normalizeRowValue(row, ["state", "State"]);
    const country = normalizeRowValue(row, ["country", "Country"]);
    const address = normalizeRowValue(row, ["address", "Address"]);
    const source = normalizeRowValue(row, ["source", "Lead Source", "leadSource"]);
    const priority = normalizeRowValue(row, ["priority", "Priority"]);
    const serviceRequired = normalizeRowValue(row, ["product", "Product", "serviceRequired", "Service"]);
    const budgetValue = normalizeRowValue(row, ["budget", "Budget"]);
    const notes = normalizeRowValue(row, ["remark", "remarks", "Remarks", "notes"]);

    const budget = budgetValue ? Number(budgetValue.replace(/[^0-9.]/g, "")) : undefined;
    if (budgetValue && Number.isNaN(budget)) {
      stats.failedRows += 1;
      stats.errors.push(`Row ${index + 1}: invalid budget value`);
      continue;
    }

    try {
      await createLead(
        {
          name,
          phone,
          email,
          companyName,
          city,
          state,
          country,
          address,
          leadSource: source ? mapLeadSource(source) : defaultSource,
          serviceRequired,
          budget,
          notes,
          priority: mapPriority(priority),
        },
        createdById,
      );
      stats.importedRows += 1;
    } catch (error: unknown) {
      if (error instanceof AppError && error.statusCode === 409) {
        stats.duplicateRows += 1;
      } else {
        stats.failedRows += 1;
        stats.errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
  }

  await prisma.importHistory.create({
    data: {
      userId: createdById,
      fileName,
      totalRows: stats.totalRows,
      importedRows: stats.importedRows,
      duplicateRows: stats.duplicateRows,
      failedRows: stats.failedRows,
      errors: stats.errors.length ? stats.errors : undefined,
    },
  });

  return stats;
}
