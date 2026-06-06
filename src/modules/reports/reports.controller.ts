import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler";
import * as svc from "./reports.service";

const typeSchema = z.enum(["leads", "followups", "employees", "sales", "revenue"]);

/**
 * @swagger
 * /reports/excel/{type}:
 *   get:
 *     summary: Export report as Excel
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [leads, followups, employees, sales, revenue]
 *     responses:
 *       200:
 *         description: Excel file download
 */
export const excel = asyncHandler(async (req: Request, res: Response) => {
  const type = typeSchema.parse(req.params.type);
  const buf = await svc.exportExcel(type);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-report.xlsx"`);
  res.send(buf);
});

/**
 * @swagger
 * /reports/pdf/{type}:
 *   get:
 *     summary: Export report as PDF
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [leads, followups, employees, sales, revenue]
 *     responses:
 *       200:
 *         description: PDF file download
 */
export const pdf = asyncHandler(async (req: Request, res: Response) => {
  const type = typeSchema.parse(req.params.type);
  const buf = await svc.exportPdf(type);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-report.pdf"`);
  res.send(buf);
});
