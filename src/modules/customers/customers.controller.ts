import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import * as svc from "./customers.service";

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: List all customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of customers
 */
export const list = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await svc.listCustomers();
  return ok(res, rows);
});

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
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
 *         description: Customer details
 */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const c = await svc.getCustomer(req.params.id);
  return ok(res, c);
});

/**
 * @swagger
 * /customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
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
 *     responses:
 *       201:
 *         description: Customer created successfully
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const c = await svc.createCustomer(req.body, req.user!.id);
  return created(res, c);
});

export const addNote = asyncHandler(async (req: Request, res: Response) => {
  const c = await svc.addCustomerNote(req.params.id, req.body.note, req.user!.id);
  return ok(res, c);
});
