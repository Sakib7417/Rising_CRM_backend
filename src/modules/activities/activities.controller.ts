import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/http";
import * as svc from "./activities.service";

/**
 * @swagger
 * /activities:
 *   get:
 *     summary: List activity logs
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of activities
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const rows = await svc.listActivities({
    userId: req.query.userId as string | undefined,
    entityType: req.query.entityType as string | undefined,
    from: req.query.from ? new Date(String(req.query.from)) : undefined,
    to: req.query.to ? new Date(String(req.query.to)) : undefined,
  });
  return ok(res, rows);
});
