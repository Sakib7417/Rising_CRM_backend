import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import * as svc from "./invoices.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await svc.createInvoice(req.body, req.user!.id);
  return created(res, invoice);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const rows = await svc.listInvoices({
    customerId: req.query.customerId as string | undefined,
    status: req.query.status as any,
  });
  return ok(res, rows);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await svc.getInvoice(req.params.id);
  return ok(res, invoice);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await svc.updateInvoice(req.params.id, req.body, req.user!.id);
  return ok(res, invoice);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteInvoice(req.params.id);
  return ok(res, { message: "Invoice deleted" });
});

export const addPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await svc.addPayment(req.params.id, req.body, req.user!.id);
  return created(res, payment);
});
