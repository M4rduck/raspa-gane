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
      winEvery: 1,
      apiKeyHash,
      prizes: {
        create: [
          {
            symbol: "CARRO",
            label: "Carro 0 KM",
            weight: 1,
            stockRemaining: 2,
            sortOrder: 0,
            imageUrl: "/prizes/car.png",
          },
          {
            symbol: "MOTO",
            label: "Moto deportiva",
            weight: 10,
            stockRemaining: null,
            sortOrder: 1,
            imageUrl: "/prizes/moto.png",
          },
          {
            symbol: "BONO",
            label: "Bono $50.000",
            weight: 50,
            stockRemaining: null,
            sortOrder: 2,
            imageUrl: "/prizes/bono.png",
          },
        ],
      },
    },
    include: { prizes: true },
  });

  console.log("\n--- Demo lista ---");
  console.log("slug:", campaign.slug);
  console.log("winEvery (premio cada N enlaces):", campaign.winEvery);
  console.log(
    "Premios (pesos 1:10:50 ≈ 1/61 carro, 10/61 moto, 50/61 bono; carro con stock 2):",
    campaign.prizes.map((p) => `${p.symbol} w=${p.weight} stock=${p.stockRemaining ?? "∞"}`).join(", "),
  );
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
