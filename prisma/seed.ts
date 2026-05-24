import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Warehouses
  const [wh1, wh2, wh3] = await Promise.all([
    prisma.warehouse.create({ data: { name: "Mumbai Central", location: "Mumbai, MH" } }),
    prisma.warehouse.create({ data: { name: "Delhi North", location: "Delhi, DL" } }),
    prisma.warehouse.create({ data: { name: "Bangalore Tech Park", location: "Bangalore, KA" } }),
  ]);

  // Products
  const [p1, p2, p3, p4] = await Promise.all([
    prisma.product.create({
      data: {
        name: "Mechanical Keyboard TKL",
        sku: "KB-TKL-001",
        description: "Tenkeyless mechanical keyboard with Cherry MX switches",
        priceInCents: 899900,
        imageUrl: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Wireless Ergonomic Mouse",
        sku: "MS-WL-002",
        description: "Contoured wireless mouse with 90-day battery life",
        priceInCents: 449900,
        imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "4K USB-C Monitor 27\"",
        sku: "MN-4K-003",
        description: "27 inch 4K IPS display with USB-C 90W power delivery",
        priceInCents: 3499900,
        imageUrl: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Noise-Cancelling Headphones",
        sku: "HP-NC-004",
        description: "Over-ear ANC headphones with 30hr battery",
        priceInCents: 1299900,
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      },
    }),
  ]);

  // Stock levels (total, reserved=0 by default)
  await prisma.stockLevel.createMany({
    data: [
      // Keyboard
      { productId: p1.id, warehouseId: wh1.id, total: 12 },
      { productId: p1.id, warehouseId: wh2.id, total: 5 },
      { productId: p1.id, warehouseId: wh3.id, total: 1 }, // almost out!
      // Mouse
      { productId: p2.id, warehouseId: wh1.id, total: 30 },
      { productId: p2.id, warehouseId: wh2.id, total: 0 }, // out of stock
      { productId: p2.id, warehouseId: wh3.id, total: 8 },
      // Monitor
      { productId: p3.id, warehouseId: wh1.id, total: 3 },
      { productId: p3.id, warehouseId: wh3.id, total: 2 },
      // Headphones
      { productId: p4.id, warehouseId: wh1.id, total: 15 },
      { productId: p4.id, warehouseId: wh2.id, total: 7 },
      { productId: p4.id, warehouseId: wh3.id, total: 4 },
    ],
  });

  console.log("✅ Seed complete");
  console.log(`   ${4} products, ${3} warehouses`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
