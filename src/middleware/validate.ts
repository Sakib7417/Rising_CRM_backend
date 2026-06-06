import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject, ZodTypeAny } from "zod";

type Schema = AnyZodObject | ZodTypeAny;

export function validateBody<T extends Schema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(parsed.error);
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T extends Schema>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(parsed.error);
    }
    req.query = parsed.data as Request["query"];
    next();
  };
}
