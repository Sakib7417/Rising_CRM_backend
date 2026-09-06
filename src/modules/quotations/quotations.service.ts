import fs from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { Prisma, QuotationStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { logActivity } from "../../services/activity.service";
import { addLeadTimeline } from "../../services/timeline.service";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "quotations");

async function ensureDir(): Promise<void> {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

interface LineItemInput {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxPercent?: number;
}

function computeLineItemTotal(item: LineItemInput): number {
  const qty = Math.max(0, item.quantity || 0);
  const price = Math.max(0, item.unitPrice || 0);
  const discount = Math.max(0, item.discount || 0);
  const taxPercent = Math.max(0, item.taxPercent || 0);
  const base = qty * price - discount;
  const tax = base * (taxPercent / 100);
  return Math.max(0, base + tax);
}

function computeTotals(lineItems: LineItemInput[]) {
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  let total = 0;
  for (const item of lineItems) {
    const qty = Math.max(0, item.quantity || 0);
    const price = Math.max(0, item.unitPrice || 0);
    const discount = Math.max(0, item.discount || 0);
    const taxPercent = Math.max(0, item.taxPercent || 0);
    const base = qty * price - discount;
    const tax = base * (taxPercent / 100);
    subtotal += qty * price;
    totalDiscount += discount;
    totalTax += tax;
    total += Math.max(0, base + tax);
  }
  return { subtotal, totalTax, totalDiscount, total };
}

function mapLineItems(input: LineItemInput[]) {
  return input.map((item) => ({
    productId: item.productId,
    description: item.description,
    quantity: Math.max(0, item.quantity || 0),
    unitPrice: new Prisma.Decimal(item.unitPrice || 0),
    discount: new Prisma.Decimal(item.discount || 0),
    taxPercent: new Prisma.Decimal(item.taxPercent || 0),
    total: new Prisma.Decimal(computeLineItemTotal(item)),
  }));
}

async function renderPdf(filePath: string, data: { title: string; lines: string[] }): Promise<void> {
  await ensureDir();
  const doc = new PDFDocument({ margin: 50 });
  const writeStream = (await import("fs")).createWriteStream(filePath);
  doc.pipe(writeStream);
  doc.fontSize(18).text(data.title, { underline: true });
  doc.moveDown();
  doc.fontSize(11);
  for (const line of data.lines) {
    doc.text(line);
    doc.moveDown(0.25);
  }
  doc.end();
  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve());
    writeStream.on("error", reject);
  });
}

export async function createQuotation(
  data: {
    customerId?: string;
    leadId?: string;
    serviceName?: string;
    amount?: number;
    tax?: number;
    discount?: number;
    status?: QuotationStatus;
    lineItems?: LineItemInput[];
  },
  userId: string,
) {
  if (!data.customerId && !data.leadId) {
    throw new AppError("Either customerId or leadId is required", 400);
  }

  const rawItems: LineItemInput[] =
    data.lineItems && data.lineItems.length
      ? data.lineItems
      : data.serviceName && data.amount !== undefined
        ? [
            {
              description: data.serviceName,
              quantity: 1,
              unitPrice: data.amount,
              discount: data.discount || 0,
              taxPercent: data.tax || 0,
            },
          ]
        : [];

  if (!rawItems.length) {
    throw new AppError("At least one line item is required", 400);
  }

  const totals = computeTotals(rawItems);
  const quotationNumber = `QUO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const q = await prisma.quotation.create({
    data: {
      customerId: data.customerId,
      leadId: data.leadId,
      quotationNumber,
      serviceName: data.serviceName || rawItems[0].description,
      amount: new Prisma.Decimal(totals.subtotal),
      tax: new Prisma.Decimal(totals.totalTax),
      discount: new Prisma.Decimal(totals.totalDiscount),
      totalAmount: new Prisma.Decimal(totals.total),
      status: data.status ?? QuotationStatus.DRAFT,
      lineItems: { create: mapLineItems(rawItems) },
    },
    include: { lineItems: { include: { product: true } }, customer: true, lead: true },
  });

  await logActivity({ userId, action: "QUOTATION_CREATED", entityType: "QUOTATION", entityId: q.id });
  if (data.leadId) {
    await addLeadTimeline({
      leadId: data.leadId,
      userId,
      action: "QUOTATION_CREATED",
      remarks: quotationNumber,
    });
  }
  return q;
}

export async function updateQuotation(
  id: string,
  data: {
    serviceName?: string;
    status?: QuotationStatus;
    lineItems?: LineItemInput[];
  },
  userId: string,
) {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Quotation not found", 404);
  }

  let updateData: Prisma.QuotationUpdateInput = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.serviceName !== undefined) updateData.serviceName = data.serviceName;

  if (data.lineItems && data.lineItems.length) {
    const totals = computeTotals(data.lineItems);
    updateData = {
      ...updateData,
      amount: new Prisma.Decimal(totals.subtotal),
      tax: new Prisma.Decimal(totals.totalTax),
      discount: new Prisma.Decimal(totals.totalDiscount),
      totalAmount: new Prisma.Decimal(totals.total),
      lineItems: {
        deleteMany: {},
        create: mapLineItems(data.lineItems),
      },
    };
  }

  const q = await prisma.quotation.update({
    where: { id },
    data: updateData,
    include: { lineItems: { include: { product: true } }, customer: true, lead: true },
  });

  await logActivity({ userId, action: "QUOTATION_UPDATED", entityType: "QUOTATION", entityId: q.id });
  return q;
}

export async function getQuotation(id: string) {
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: { lineItems: { include: { product: true } }, customer: true, lead: true, invoices: true },
  });
  if (!q) {
    throw new AppError("Quotation not found", 404);
  }
  return q;
}

export async function generateQuotationPdf(id: string, userId: string) {
  const q = await getQuotation(id);
  await ensureDir();
  const filePath = path.join(UPLOAD_ROOT, `${id}.pdf`);
  const lines = [
    `Quotation: ${q.quotationNumber}`,
    q.customer ? `Customer: ${q.customer.name}` : "",
    q.lead ? `Lead: ${q.lead.name}` : "",
    `Status: ${q.status}`,
    "",
    "Items:",
    ...q.lineItems.map(
      (item, idx) =>
        `${idx + 1}. ${item.description} | Qty: ${item.quantity} | Unit: ${item.unitPrice.toString()} | Tax: ${item.taxPercent.toString()}% | Total: ${item.total.toString()}`,
    ),
    "",
    `Subtotal: ${q.amount.toString()}`,
    `Tax: ${q.tax.toString()}`,
    `Discount: ${q.discount.toString()}`,
    `Total: ${q.totalAmount.toString()}`,
  ];
  await renderPdf(filePath, { title: "Sales Quotation", lines: lines.filter(Boolean) });
  const pdfUrl = `/uploads/quotations/${id}.pdf`;
  const updated = await prisma.quotation.update({
    where: { id },
    data: { pdfUrl },
  });
  await logActivity({ userId, action: "QUOTATION_PDF", entityType: "QUOTATION", entityId: id });
  return updated;
}

export async function listQuotations() {
  return prisma.quotation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lineItems: { include: { product: true } },
      customer: true,
      lead: { select: { id: true, name: true } },
    },
  });
}

export async function sendQuotation(id: string, userId: string) {
  const q = await prisma.quotation.findUnique({ where: { id } });
  if (!q) {
    throw new AppError("Quotation not found", 404);
  }
  await prisma.quotation.update({
    where: { id },
    data: { status: QuotationStatus.SENT },
  });
  await logActivity({
    userId,
    action: "QUOTATION_SEND",
    entityType: "QUOTATION",
    entityId: id,
    remarks: "Quotation marked as sent; email/WhatsApp provider not configured",
  });
  return { message: "Quotation marked as sent; connect email/WhatsApp providers in notification service." };
}
