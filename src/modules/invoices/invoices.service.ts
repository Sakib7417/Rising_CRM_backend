import { InvoiceStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../services/activity.service";

function computeInvoiceTotal(amount: number, tax = 0, discount = 0): number {
  return Math.max(0, amount + tax - discount);
}

function determineStatus(paid: number, total: number, currentStatus: InvoiceStatus, dueDate?: Date | null): InvoiceStatus {
  if (paid >= total) return InvoiceStatus.PAID;
  if (paid > 0) return InvoiceStatus.PARTIALLY_PAID;
  if (dueDate && new Date() > dueDate && currentStatus !== InvoiceStatus.CANCELLED) return InvoiceStatus.OVERDUE;
  return currentStatus;
}

export async function createInvoice(
  data: {
    customerId: string;
    leadId?: string;
    dealId?: string;
    quotationId?: string;
    amount: number;
    tax?: number;
    discount?: number;
    dueDate?: string;
    notes?: string;
  },
  userId: string,
) {
  const tax = data.tax ?? 0;
  const discount = data.discount ?? 0;
  const total = computeInvoiceTotal(data.amount, tax, discount);
  const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: data.customerId,
      leadId: data.leadId,
      dealId: data.dealId,
      quotationId: data.quotationId,
      amount: new Prisma.Decimal(data.amount),
      tax: new Prisma.Decimal(tax),
      discount: new Prisma.Decimal(discount),
      totalAmount: new Prisma.Decimal(total),
      status: InvoiceStatus.DRAFT,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      notes: data.notes,
      createdById: userId,
    },
    include: { customer: true, lead: true, deal: true, quotation: true, payments: true },
  });

  await logActivity({ userId, action: "INVOICE_CREATED", entityType: "INVOICE", entityId: invoice.id });
  return invoice;
}

export async function listInvoices(filters?: { customerId?: string; status?: InvoiceStatus; userId?: string }) {
  return prisma.invoice.findMany({
    where: {
      customerId: filters?.customerId,
      status: filters?.status,
      ...(filters?.userId ? { createdById: filters.userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { customer: true, lead: true, deal: true, quotation: true, payments: true },
  });
}

export async function getInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, lead: true, deal: true, quotation: true, payments: { include: { createdBy: { select: { id: true, name: true } } } } },
  });
  if (!invoice) throw new AppError("Invoice not found", 404);
  return invoice;
}

export async function updateInvoice(
  id: string,
  data: {
    amount?: number;
    tax?: number;
    discount?: number;
    dueDate?: string;
    notes?: string;
    status?: InvoiceStatus;
  },
  userId: string,
) {
  const existing = await getInvoice(id);
  if (existing.status === InvoiceStatus.PAID || existing.status === InvoiceStatus.CANCELLED) {
    if (data.amount !== undefined || data.tax !== undefined || data.discount !== undefined) {
      throw new AppError("Cannot modify amounts of paid or cancelled invoice", 400);
    }
  }

  const paidSoFar = existing.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const amount = data.amount !== undefined ? data.amount : Number(existing.amount);
  const tax = data.tax !== undefined ? data.tax : Number(existing.tax);
  const discount = data.discount !== undefined ? data.discount : Number(existing.discount);
  const total = computeInvoiceTotal(amount, tax, discount);

  const status = data.status
    ? data.status
    : determineStatus(paidSoFar, total, existing.status, data.dueDate ? new Date(data.dueDate) : existing.dueDate);

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      amount: new Prisma.Decimal(amount),
      tax: new Prisma.Decimal(tax),
      discount: new Prisma.Decimal(discount),
      totalAmount: new Prisma.Decimal(total),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
      status,
    },
    include: { customer: true, lead: true, deal: true, quotation: true, payments: true },
  });

  await logActivity({ userId, action: "INVOICE_UPDATED", entityType: "INVOICE", entityId: id });
  return invoice;
}

export async function addPayment(
  invoiceId: string,
  data: { amount: number; paymentDate?: string; paymentMethod?: string; transactionId?: string; notes?: string },
  userId: string,
) {
  const invoice = await getInvoice(invoiceId);
  const paidSoFar = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  if (paidSoFar + data.amount > Number(invoice.totalAmount)) {
    throw new AppError("Payment exceeds invoice total", 400);
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: new Prisma.Decimal(data.amount),
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      notes: data.notes,
      createdById: userId,
    },
  });

  const newPaid = paidSoFar + data.amount;
  const status = determineStatus(newPaid, Number(invoice.totalAmount), invoice.status, invoice.dueDate);
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status, paidAt: status === InvoiceStatus.PAID ? new Date() : undefined },
  });

  await logActivity({
    userId,
    action: "PAYMENT_ADDED",
    entityType: "INVOICE",
    entityId: invoiceId,
    remarks: `Amount: ${data.amount}`,
  });

  return payment;
}

export async function deleteInvoice(id: string) {
  await getInvoice(id);
  return prisma.invoice.delete({ where: { id } });
}
