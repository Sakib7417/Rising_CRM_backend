import type { Response } from "express";

export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ success: true, data });
}

export function paginated<T>(
  res: Response,
  data: { items: T[]; total: number; page: number; pageSize: number },
): Response {
  return res.json({
    success: true,
    data: data.items,
    meta: {
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.ceil(data.total / data.pageSize) || 0,
    },
  });
}
