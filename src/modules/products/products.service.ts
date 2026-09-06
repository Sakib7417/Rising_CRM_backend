import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

export async function createProduct(data: {
  name: string;
  description?: string;
  price: number;
  taxPercent?: number;
  unit?: string;
  isActive?: boolean;
}) {
  return prisma.productService.create({
    data: {
      name: data.name,
      description: data.description,
      price: new Prisma.Decimal(data.price),
      taxPercent: new Prisma.Decimal(data.taxPercent ?? 0),
      unit: data.unit,
      isActive: data.isActive ?? true,
    },
  });
}

export async function listProducts(activeOnly = false) {
  return prisma.productService.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function getProduct(id: string) {
  const p = await prisma.productService.findUnique({ where: { id } });
  if (!p) throw new AppError("Product not found", 404);
  return p;
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    price: number;
    taxPercent: number;
    unit: string;
    isActive: boolean;
  }>,
) {
  await getProduct(id);
  const updateData: Prisma.ProductServiceUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price);
  if (data.taxPercent !== undefined) updateData.taxPercent = new Prisma.Decimal(data.taxPercent);
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  return prisma.productService.update({ where: { id }, data: updateData });
}

export async function deleteProduct(id: string) {
  await getProduct(id);
  return prisma.productService.delete({ where: { id } });
}
