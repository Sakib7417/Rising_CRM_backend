import type { Request, Response } from "express";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok, paginated } from "../../utils/http";
import { AppError } from "../../utils/AppError";
import * as leadSvc from "./leads.service";
import { listLeadTimeline } from "../../services/timeline.service";

/**
 * @swagger
 * /leads:
 *   post:
 *     summary: Create a new lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               companyName:
 *                 type: string
 *               leadSource:
 *                 type: string
 *                 enum: [INDIAMART, WEBSITE, FACEBOOK, WHATSAPP, REFERRAL, MANUAL]
 *     responses:
 *       201:
 *         description: Lead created successfully
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadSvc.createLead(req.body, req.user!.id);
  return created(res, lead);
});

/**
 * @swagger
 * /leads:
 *   get:
 *     summary: List all leads
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of leads
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const result = await leadSvc.listLeads(
    {
      page: Number(q.page ?? 1),
      pageSize: Number(q.pageSize ?? 20),
      search: q.search as string | undefined,
      leadStatus: q.leadStatus as never,
      leadSource: q.leadSource as never,
      isActive: q.isActive === "true" ? true : q.isActive === "false" ? false : undefined,
      assignedToId: q.assignedToId as string | undefined,
      city: q.city as string | undefined,
      fromDate: q.fromDate ? new Date(String(q.fromDate)) : undefined,
      toDate: q.toDate ? new Date(String(q.toDate)) : undefined,
    },
    { id: req.user!.id, role: req.user!.role },
  );
  return paginated(res, result);
});

/**
 * @swagger
 * /leads/{id}:
 *   get:
 *     summary: Get lead by ID
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lead details
 */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadSvc.getLead(req.params.id, { id: req.user!.id, role: req.user!.role });
  return ok(res, lead);
});

/**
 * @swagger
 * /leads/{id}:
 *   put:
 *     summary: Update lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               leadStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead updated successfully
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadSvc.updateLead(req.params.id, req.body, req.user!.id);
  return ok(res, lead);
});

/**
 * @swagger
 * /leads/{id}:
 *   delete:
 *     summary: Delete lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lead deleted successfully
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await leadSvc.deleteLead(req.params.id, req.user!.id);
  return ok(res, { message: "Deleted" });
});

/**
 * @swagger
 * /leads/{id}/assign:
 *   post:
 *     summary: Assign lead to user
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignedToId]
 *             properties:
 *               assignedToId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead assigned successfully
 */
export const assign = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadSvc.assignLead(req.params.id, req.body.assignedToId, req.user!.id);
  return ok(res, lead);
});

export const bulkAssign = asyncHandler(async (req: Request, res: Response) => {
  const r = await leadSvc.bulkAssignLeads(req.body.leadIds, req.body.assignedToId, req.user!.id);
  return ok(res, r);
});

export const changeStatus = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadSvc.changeLeadStatus(
    req.params.id,
    req.body.leadStatus,
    req.user!.id,
    req.body.remarks,
  );
  return ok(res, lead);
});

export const toggleActive = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadSvc.setLeadActive(req.params.id, req.body.isActive, req.user!.id, req.body.remarks);
  return ok(res, lead);
});

export const importIndiaMart = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadSvc.importIndiaMartLead(req.body.rawText, req.user!.id);
  return created(res, lead);
});

export const convert = asyncHandler(async (req: Request, res: Response) => {
  const customer = await leadSvc.convertLeadToCustomer(req.params.id, req.user!.id);
  return created(res, customer);
});

export const timeline = asyncHandler(async (req: Request, res: Response) => {
  const events = await listLeadTimeline(req.params.id);
  return ok(res, events);
});

export const bulkCsv = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, error: "CSV or Excel file required" });
  }

  const extension = file.originalname.split(".").pop()?.toLowerCase();
  let records: Record<string, string>[] = [];

  if (extension === "csv") {
    records = parse(file.buffer.toString("utf8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
  } else if (extension === "xlsx" || extension === "xls") {
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : (Buffer.from(file.buffer as any) as Buffer);
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0] as ExcelJS.Worksheet;
    const headerRow = worksheet.getRow(1).values as Array<string | null>;
    const headers = headerRow.slice(1).map((value) => (typeof value === "string" ? value.trim() : ""));

    const worksheetRows = worksheet.getRows(2, worksheet.rowCount - 1) ?? [];
    records = worksheetRows
      .filter((row): row is ExcelJS.Row => Boolean(row))
      .map((row) => {
        const record: Record<string, string> = {};
        headers.forEach((header, index) => {
          const cell = row.getCell(index + 1);
          if (cell !== null && cell !== undefined) {
            record[header] = String(cell.text ?? cell.value ?? "").trim();
          }
        });
        return record;
      });
  } else {
    return res.status(400).json({ success: false, error: "Unsupported file type. Use CSV or XLSX." });
  }

  const result = await leadSvc.bulkCreateLeadsFromRows(records, req.user!.id, undefined, file.originalname);
  return ok(res, result);
});
