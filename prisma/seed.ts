import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.OWNER_USERNAME ?? "owner";
  const password = process.env.OWNER_PASSWORD ?? "change-me";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.owner.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
