import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import {
  assignLeadsToUser,
  createUser,
  deleteUser,
  employeePerformance,
  getUserById,
  listUsers,
  updateUser,
} from "./users.service";

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const users = await listUsers({
    role: req.query.role as never,
    isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
  });
  return ok(res, users);
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
 *         description: User details
 */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserById(req.params.id);
  return ok(res, user);
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [SUPER_ADMIN, ADMIN, SALES_MANAGER, SALES_AGENT, EMPLOYEE]
 *     responses:
 *       201:
 *         description: User created successfully
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = await createUser(req.body, req.user!.id);
  return created(res, user);
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const user = await updateUser(req.params.id, req.body, req.user!.id);
  return ok(res, user);
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
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
 *         description: User deleted successfully
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteUser(req.params.id, req.user!.id);
  return ok(res, { message: "Deleted" });
});

export const assignLeads = asyncHandler(async (req: Request, res: Response) => {
  const result = await assignLeadsToUser(req.params.id, req.body.leadIds, req.user!.id);
  return ok(res, result);
});

export const performance = asyncHandler(async (req: Request, res: Response) => {
  const stats = await employeePerformance(req.params.id);
  return ok(res, stats);
});
