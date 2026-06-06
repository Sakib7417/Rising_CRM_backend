import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/http";
import * as svc from "./dashboard.service";

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: Get dashboard overview
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
export const overview = asyncHandler(async (req: Request, res: Response) => {
  const stats = await svc.getDashboardStats(req.user!.id, req.user!.role);
  return ok(res, stats);
});

/**
 * @swagger
 * /dashboard/analytics:
 *   get:
 *     summary: Get sales analytics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales analytics data
 */
export const analytics = asyncHandler(async (_req: Request, res: Response) => {
  const data = await svc.salesAnalytics();
  return ok(res, data);
});
