import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { AppError } from "../utils/AppError";

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403));
    }
    next();
  };
}

export const adminRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
export const managerRoles: UserRole[] = [...adminRoles, UserRole.SALES_MANAGER];
