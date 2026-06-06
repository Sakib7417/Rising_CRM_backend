import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { prisma } from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { hashToken, randomToken } from "../../utils/crypto";
import { logActivity } from "../../services/activity.service";

const SALT_ROUNDS = 12;

function refreshExpiryDate(): Date {
  const s = env.REFRESH_TOKEN_EXPIRES_IN.trim();
  const m = /^(\d+)([smhd])$/i.exec(s);
  if (!m) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  const n = Number.parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult =
    unit === "s" ? 1000 : unit === "m" ? 60 * 1000 : unit === "h" ? 3600 * 1000 : 24 * 3600 * 1000;
  return new Date(Date.now() + n * mult);
}

function signAccessToken(user: { id: string; email: string; role: UserRole }): string {
  const expiresIn = env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"];
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn,
  });
}

function signRefreshToken(user: { id: string; email: string; role: UserRole }): string {
  const expiresIn = env.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"];
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_REFRESH_SECRET, {
    expiresIn,
  });
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
}) {
  const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (exists) {
    throw new AppError("Email already registered", 409);
  }
  const password = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      password,
      role: input.role ?? UserRole.EMPLOYEE,
    },
  });
  await logActivity({
    userId: user.id,
    action: "USER_REGISTERED",
    entityType: "USER",
    entityId: user.id,
  });
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiryDate(),
    },
  });
  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function loginUser(
  input: { email: string; password: string },
  meta?: { ip?: string; userAgent?: string },
) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.isActive) {
    throw new AppError("Invalid credentials", 401);
  }
  const match = await bcrypt.compare(input.password, user.password);
  if (!match) {
    throw new AppError("Invalid credentials", 401);
  }
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiryDate(),
    },
  });
  await logActivity({
    userId: user.id,
    action: "LOGIN",
    remarks: "User logged in",
    ipAddress: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refreshSession(refreshToken: string) {
  let payload: { sub: string; email: string; role: UserRole };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as typeof payload;
  } catch {
    throw new AppError("Invalid refresh token", 401);
  }
  const hash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash: hash, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!stored) {
    throw new AppError("Invalid refresh token", 401);
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new AppError("Unauthorized", 401);
  }
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });
  const accessToken = signAccessToken(user);
  const newRefresh = signRefreshToken(user);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRefresh),
      expiresAt: refreshExpiryDate(),
    },
  });
  return { user: sanitizeUser(user), accessToken, refreshToken: newRefresh };
}

export async function logoutUser(refreshToken: string | undefined, userId?: string): Promise<void> {
  if (refreshToken) {
    const hash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } else if (userId) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) {
    throw new AppError("Current password is incorrect", 400);
  }
  const password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { password } });
  await logActivity({ userId, action: "PASSWORD_CHANGED", entityType: "USER", entityId: userId });
}

export async function forgotPassword(email: string): Promise<{ resetToken: string }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return { resetToken: "" };
  }
  const token = randomToken(32);
  const tokenHash = hashToken(token);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return { resetToken: token };
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!record) {
    throw new AppError("Invalid or expired token", 400);
  }
  const password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}

export function sanitizeUser<T extends { password: string }>(user: T): Omit<T, "password"> {
  const { password: _p, ...rest } = user;
  return rest;
}
