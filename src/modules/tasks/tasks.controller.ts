import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import * as svc from "./tasks.service";

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Task created successfully
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const t = await svc.createTask(req.body, req.user!.id);
  return created(res, t);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const t = await svc.updateTask(req.params.id, req.body, req.user!.id);
  return ok(res, t);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteTask(req.params.id, req.user!.id);
  return ok(res, { message: "Deleted" });
});

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: List all tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tasks
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId =
    req.user!.role === "SALES_AGENT" || req.user!.role === "EMPLOYEE"
      ? req.user!.id
      : (req.query.assignedToId as string | undefined);
  const rows = await svc.listTasks({
    assignedToId: userId,
    status: req.query.status as never,
  });
  return ok(res, rows);
});
