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

function computeTotal(amount: number, tax = 0, discount = 0): number {
  return Math.max(0, amount + tax - discount);
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
    serviceName: string;
    amount: number;
    tax?: number;
    discount?: number;
    status?: QuotationStatus;
  },
  userId: string,
) {
  const tax = data.tax ?? 0;
  const discount = data.discount ?? 0;
  const total = computeTotal(data.amount, tax, discount);
  const quotationNumber = `QUO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const q = await prisma.quotation.create({
    data: {
      customerId: data.customerId,
      leadId: data.leadId,
      quotationNumber,
      serviceName: data.serviceName,
      amount: new Prisma.Decimal(data.amount),
      tax: new Prisma.Decimal(tax),
      discount: new Prisma.Decimal(discount),
      totalAmount: new Prisma.Decimal(total),
      status: data.status ?? QuotationStatus.DRAFT,
    },
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

export async function generateQuotationPdf(id: string, userId: string) {
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: { customer: true, lead: true },
  });
  if (!q) {
    throw new AppError("Quotation not found", 404);
  }
  await ensureDir();
  const filePath = path.join(UPLOAD_ROOT, `${id}.pdf`);
  const lines = [
    `Quotation: ${q.quotationNumber}`,
    `Service: ${q.serviceName}`,
    `Amount: ${q.amount.toString()}`,
    `Tax: ${q.tax.toString()}`,
    `Discount: ${q.discount.toString()}`,
    `Total: ${q.totalAmount.toString()}`,
    `Status: ${q.status}`,
  ];
  await renderPdf(filePath, { title: "Sales Quotation", lines });
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
    include: { customer: true, lead: { select: { id: true, name: true } } },
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
    remarks: "Email/WhatsApp dispatch queued (integrate provider)",
  });
  return { message: "Quotation marked as sent; connect email/WhatsApp providers in notification service." };
}
