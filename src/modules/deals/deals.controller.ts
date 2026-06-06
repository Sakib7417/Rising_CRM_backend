import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import * as svc from "./deals.service";

/**
 * @swagger
 * /deals:
 *   post:
 *     summary: Create a new deal
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, amount]
 *             properties:
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               stage:
 *                 type: string
 *                 enum: [NEW, DISCUSSION, PROPOSAL_SENT, NEGOTIATION, WON, LOST]
 *     responses:
 *       201:
 *         description: Deal created successfully
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const d = await svc.createDeal(req.body, req.user!.id);
  return created(res, d);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const d = await svc.updateDeal(req.params.id, req.body, req.user!.id);
  return ok(res, d);
});

/**
 * @swagger
 * /deals:
 *   get:
 *     summary: List all deals
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of deals
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const rows = await svc.listDeals({
    stage: req.query.stage as never,
    assignedToId: req.query.assignedToId as string | undefined,
  });
  return ok(res, rows);
});

/**
 * @swagger
 * /deals/pipeline:
 *   get:
 *     summary: Get deal pipeline
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deal pipeline data
 */
export const pipeline = asyncHandler(async (_req: Request, res: Response) => {
  const data = await svc.pipeline();
  return ok(res, data);
});

export const analytics = asyncHandler(async (_req: Request, res: Response) => {
  const data = await svc.dealAnalytics();
  return ok(res, data);
});
