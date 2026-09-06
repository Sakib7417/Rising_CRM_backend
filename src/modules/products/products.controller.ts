import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import * as svc from "./products.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const p = await svc.createProduct(req.body);
  return created(res, p);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const rows = await svc.listProducts(req.query.active === "true");
  return ok(res, rows);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const p = await svc.getProduct(req.params.id);
  return ok(res, p);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const p = await svc.updateProduct(req.params.id, req.body);
  return ok(res, p);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteProduct(req.params.id);
  return ok(res, { message: "Product deleted" });
});
