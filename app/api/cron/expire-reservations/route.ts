import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Called by Vercel Cron every minute: */1 * * * *
// Secured by CRON_SECRET env var
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all expired PENDING reservations
    const expired = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
      select: {
        id: true,
        quantity: true,
        productId: true,
        warehouseId: true,
      },
    });

    if (expired.length === 0) {
      return NextResponse.json({ released: 0 });
    }

    // Release each in a single transaction
    await prisma.$transaction(async (tx) => {
      for (const r of expired) {
        // Return units to available stock
        await tx.$executeRaw`
          UPDATE "StockLevel"
          SET reserved = GREATEST(0, reserved - ${r.quantity})
          WHERE "productId" = ${r.productId}
            AND "warehouseId" = ${r.warehouseId}
        `;
      }

      // Bulk update all expired reservations to RELEASED
      await tx.reservation.updateMany({
        where: {
          id: { in: expired.map((r) => r.id) },
        },
        data: { status: "RELEASED" },
      });
    });

    console.log(`[cron] Released ${expired.length} expired reservations`);
    return NextResponse.json({ released: expired.length });
  } catch (err) {
    console.error("[cron] Error releasing expired reservations:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
