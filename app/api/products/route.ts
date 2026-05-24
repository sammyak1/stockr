import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/errors";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stockLevels: {
          include: { warehouse: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const response = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      imageUrl: p.imageUrl,
      priceInCents: p.priceInCents,
      stockByWarehouse: p.stockLevels.map((sl) => ({
        warehouseId: sl.warehouseId,
        warehouseName: sl.warehouse.name,
        warehouseLocation: sl.warehouse.location,
        total: sl.total,
        reserved: sl.reserved,
        available: sl.total - sl.reserved, // derived, never stored
      })),
    }));

    return NextResponse.json(response);
  } catch (err) {
    return apiError(err);
  }
}
