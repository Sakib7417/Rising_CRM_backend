import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../../config/db";

type ReportType = "leads" | "followups" | "employees" | "sales" | "revenue";

async function fetchReportData(type: ReportType) {
  switch (type) {
    case "leads":
      return prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 5000,
        include: { assignedTo: { select: { name: true } } },
      });
    case "followups":
      return prisma.followup.findMany({
        orderBy: { followupDate: "desc" },
        take: 5000,
        include: { lead: { select: { name: true } }, createdBy: { select: { name: true } } },
      });
    case "employees":
      return prisma.user.findMany({
        select: {
          name: true,
          email: true,
          role: true,
          targetAmount: true,
          achievedAmount: true,
          isActive: true,
        },
      });
    case "sales":
      return prisma.deal.findMany({
        orderBy: { createdAt: "desc" },
        take: 5000,
        include: { assignedTo: { select: { name: true } }, customer: { select: { name: true } } },
      });
    case "revenue":
      return prisma.deal.findMany({
        where: { stage: "WON" },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      });
    default:
      return [];
  }
}

export async function exportExcel(type: ReportType): Promise<Buffer> {
  const rows = await fetchReportData(type);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${type}-report`);
  if (!rows.length) {
    sheet.addRow(["No data"]);
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
  const keys = Object.keys(rows[0] as object);
  sheet.addRow(keys);
  for (const row of rows) {
    sheet.addRow(
      keys.map((k) => {
        const v = (row as Record<string, unknown>)[k];
        if (v && typeof v === "object" && "toString" in v) {
          return String(v);
        }
        if (v && typeof v === "object") {
          return JSON.stringify(v);
        }
        return v ?? "";
      }),
    );
  }
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function exportPdf(type: ReportType): Promise<Buffer> {
  const rows = await fetchReportData(type);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(16).text(`${type.toUpperCase()} Report`);
    doc.moveDown();
    doc.fontSize(9);
    const preview = rows.slice(0, 50);
    for (const row of preview) {
      doc.text(JSON.stringify(row).slice(0, 500));
      doc.moveDown(0.3);
    }
    if (rows.length > 50) {
      doc.text(`... and ${rows.length - 50} more rows`);
    }
    doc.end();
  });
}
