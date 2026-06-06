import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import * as svc from "./followups.service";

/**
 * @swagger
 * /followups:
 *   post:
 *     summary: Create a followup
 *     tags: [Followups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leadId, followupDate]
 *             properties:
 *               leadId:
 *                 type: string
 *               followupDate:
 *                 type: string
 *                 format: date-time
 *               remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Followup created successfully
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const f = await svc.addFollowup({ ...req.body, createdById: req.user!.id });
  return created(res, f);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const f = await svc.updateFollowup(req.params.id, req.body, req.user!.id);
  return ok(res, f);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteFollowup(req.params.id, req.user!.id);
  return ok(res, { message: "Deleted" });
});

/**
 * @swagger
 * /followups/lead/{leadId}:
 *   get:
 *     summary: Get followup history for a lead
 *     tags: [Followups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Followup history
 */
export const history = asyncHandler(async (req: Request, res: Response) => {
  const list = await svc.listFollowupsForLead(req.params.leadId);
  return ok(res, list);
});

export const daily = asyncHandler(async (req: Request, res: Response) => {
  const date = (req.query.date as Date | undefined) ?? new Date();
  const userId =
    req.user!.role === "SUPER_ADMIN" || req.user!.role === "ADMIN" || req.user!.role === "SALES_MANAGER"
      ? (req.query.userId as string | undefined)
      : req.user!.id;
  const list = await svc.dailyFollowups(date, userId);
  return ok(res, list);
});

export const missed = asyncHandler(async (req: Request, res: Response) => {
  const userId =
    req.user!.role === "SUPER_ADMIN" || req.user!.role === "ADMIN" || req.user!.role === "SALES_MANAGER"
      ? (req.query.userId as string | undefined)
      : req.user!.id;
  const list = await svc.missedFollowups(userId);
  return ok(res, list);
});

export const upcoming = asyncHandler(async (req: Request, res: Response) => {
  const within = Number(req.query.withinDays ?? 7);
  const userId =
    req.user!.role === "SUPER_ADMIN" || req.user!.role === "ADMIN" || req.user!.role === "SALES_MANAGER"
      ? (req.query.userId as string | undefined)
      : req.user!.id;
  const list = await svc.upcomingFollowups(within, userId);
  return ok(res, list);
});
