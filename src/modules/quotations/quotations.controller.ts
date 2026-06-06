import type { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import * as svc from "./quotations.service";

/**
 * @swagger
 * /quotations:
 *   post:
 *     summary: Create a quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceName, amount]
 *             properties:
 *               leadId:
 *                 type: string
 *               customerId:
 *                 type: string
 *               serviceName:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Quotation created successfully
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const q = await svc.createQuotation(req.body, req.user!.id);
  return created(res, q);
});

/**
 * @swagger
 * /quotations:
 *   get:
 *     summary: List all quotations
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of quotations
 */
export const list = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await svc.listQuotations();
  return ok(res, rows);
});

/**
 * @swagger
 * /quotations/{id}/pdf:
 *   post:
 *     summary: Generate quotation PDF
 *     tags: [Quotations]
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
 *         description: PDF generated successfully
 */
export const generatePdf = asyncHandler(async (req: Request, res: Response) => {
  const q = await svc.generateQuotationPdf(req.params.id, req.user!.id);
  return ok(res, q);
});

export const download = asyncHandler(async (req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), "uploads", "quotations", `${req.params.id}.pdf`);
  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ success: false, error: "PDF not generated yet" });
  }
  res.download(filePath, `quotation-${req.params.id}.pdf`);
});

export const send = asyncHandler(async (req: Request, res: Response) => {
  const r = await svc.sendQuotation(req.params.id, req.user!.id);
  return ok(res, r);
});
