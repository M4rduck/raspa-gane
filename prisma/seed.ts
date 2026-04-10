import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.campaign.findUnique({ where: { slug: "mundialista-demo" } });
  if (existing) {
    console.log(
      'La campaña "mundialista-demo" ya existe. Borra esa fila en Prisma Studio y vuelve a ejecutar el seed si necesitas una API key nueva en consola.',
    );
    return;
  }

  const apiKey = `sg_${nanoid(40)}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 12);

  const campaign = await prisma.campaign.create({
    data: {
      name: "Raspe Mundialista — Demo",
      slug: "mundialista-demo",
      winEvery: 5,
      apiKeyHash,
    },
  });

  console.log("\n--- Demo lista ---");
  console.log("slug:", campaign.slug);
  console.log("winEvery (premio cada N enlaces):", campaign.winEvery);
  console.log("API key (guárdala; solo se muestra ahora):", apiKey);
  console.log("POST /api/v1/links con header: Authorization: Bearer <apiKey>");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
