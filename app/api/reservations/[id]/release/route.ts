import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  ReservationNotFoundError,
  ReservationInvalidStateError,
} from "@/lib/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const [reservation] = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          quantity: number;
          productId: string;
          warehouseId: string;
        }>
      >`
        SELECT id, status, quantity, "productId", "warehouseId"
        FROM "Reservation"
        WHERE id = ${params.id}
        FOR UPDATE
      `;

      if (!reservation) throw new ReservationNotFoundError();

      // Idempotent: already released is fine
      if (reservation.status === "RELEASED") {
        return tx.reservation.findUniqueOrThrow({
          where: { id: params.id },
          include: {
            product: { select: { id: true, name: true, sku: true, priceInCents: true, imageUrl: true } },
            warehouse: { select: { id: true, name: true, location: true } },
          },
        });
      }

      if (reservation.status === "CONFIRMED") {
        throw new ReservationInvalidStateError(
          "Cannot release a confirmed reservation. Contact support."
        );
      }

      // Decrement reserved count — stock returns to available
      await tx.$executeRaw`
        UPDATE "StockLevel"
        SET reserved = GREATEST(0, reserved - ${reservation.quantity})
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      return tx.reservation.update({
        where: { id: params.id },
        data: { status: "RELEASED" },
        include: {
          product: { select: { id: true, name: true, sku: true, priceInCents: true, imageUrl: true } },
          warehouse: { select: { id: true, name: true, location: true } },
        },
      });
    });

    return NextResponse.json({
      ...updated,
      expiresAt: updated.expiresAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    return apiError(err);
  }
}
