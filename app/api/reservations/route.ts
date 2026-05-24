import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, InsufficientStockError } from "@/lib/errors";
import { CreateReservationSchema } from "@/lib/schemas";
import { withIdempotency } from "@/lib/idempotency";

const RESERVATION_TTL_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;
    const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined;

    const { status, body: responseBody } = await withIdempotency(
      idempotencyKey,
      async () => {
        // ─── Critical section: SELECT FOR UPDATE ───────────────────────────
        // Two simultaneous requests for the last unit will serialize here.
        // The first to acquire the row lock checks stock, increments reserved,
        // and commits. The second then re-checks and sees 0 available → 409.
        const reservation = await prisma.$transaction(async (tx) => {
          // Lock the specific stock row for this product+warehouse combo
          const [stock] = await tx.$queryRaw<
            Array<{ id: string; total: number; reserved: number }>
          >`
            SELECT id, total, reserved
            FROM "StockLevel"
            WHERE "productId" = ${productId}
              AND "warehouseId" = ${warehouseId}
            FOR UPDATE
          `;

          if (!stock) {
            throw new InsufficientStockError();
          }

          const available = stock.total - stock.reserved;
          if (available < quantity) {
            throw new InsufficientStockError();
          }

          // Increment reserved count atomically inside the transaction
          await tx.$executeRaw`
            UPDATE "StockLevel"
            SET reserved = reserved + ${quantity}
            WHERE id = ${stock.id}
          `;

          const expiresAt = new Date(
            Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
          );

          return tx.reservation.create({
            data: {
              productId,
              warehouseId,
              quantity,
              expiresAt,
              idempotencyKey: idempotencyKey ?? null,
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  priceInCents: true,
                  imageUrl: true,
                },
              },
              warehouse: {
                select: { id: true, name: true, location: true },
              },
            },
          });
        });
        // ───────────────────────────────────────────────────────────────────

        return {
          status: 201,
          body: {
            ...reservation,
            expiresAt: reservation.expiresAt.toISOString(),
            createdAt: reservation.createdAt.toISOString(),
            updatedAt: reservation.updatedAt.toISOString(),
          },
        };
      }
    );

    return NextResponse.json(responseBody, { status });
  } catch (err) {
    return apiError(err);
  }
}
