import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/http";
import { listNotifications, markNotificationRead } from "../../services/notification.service";

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of notifications
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const rows = await listNotifications(req.user!.id, req.query.unreadOnly === "true");
  return ok(res, rows);
});

/**
 * @swagger
 * /notifications/{id}/read:
 *   post:
 *     summary: Mark notification as read
 *     tags: [Notifications]
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
 *         description: Notification marked as read
 */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await markNotificationRead(req.params.id, req.user!.id);
  return ok(res, { message: "Marked read" });
});
