import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import {
  changePassword,
  forgotPassword,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  resetPassword,
  sanitizeUser,
} from "./auth.service";
import { prisma } from "../../config/db";
import { UserRole } from "@prisma/client";

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
export const registerPublic = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser({ ...req.body, role: UserRole.EMPLOYEE });
  return created(res, result);
});

export const registerStaff = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser(req.body);
  return created(res, result);
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body, {
    ip: req.ip,
    userAgent: req.headers["user-agent"] ?? undefined,
  });
  return ok(res, result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await refreshSession(req.body.refreshToken);
  return ok(res, result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await logoutUser(req.body?.refreshToken, req.user?.id);
  return ok(res, { message: "Logged out" });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    return res.status(404).json({ success: false, error: "Not found" });
  }
  return ok(res, sanitizeUser(user));
});

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
export const changePasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  return ok(res, { message: "Password updated" });
});

export const forgotPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await forgotPassword(req.body.email);
  return ok(res, result);
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await resetPassword(req.body.token, req.body.newPassword);
  return ok(res, { message: "Password reset successful" });
});
