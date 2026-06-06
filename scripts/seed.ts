import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@salescrm.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log("Admin already exists:", email);
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name: "Super Admin",
      email,
      password: hash,
      role: UserRole.SUPER_ADMIN,
    },
  });
  // eslint-disable-next-line no-console
  console.log("Seeded SUPER_ADMIN:", email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
