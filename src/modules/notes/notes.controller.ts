import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import * as svc from "./notes.service";

/**
 * @swagger
 * /notes:
 *   post:
 *     summary: Add a note to a lead
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leadId, note]
 *             properties:
 *               leadId:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note created successfully
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const n = await svc.addNote(req.body.leadId, req.user!.id, req.body.note);
  return created(res, n);
});

/**
 * @swagger
 * /notes/lead/{leadId}:
 *   get:
 *     summary: Get notes for a lead
 *     tags: [Notes]
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
 *         description: List of notes
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const notes = await svc.listNotes(req.params.leadId);
  return ok(res, notes);
});
