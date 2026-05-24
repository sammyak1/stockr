import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  ReservationExpiredError,
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
          expiresAt: Date;
          quantity: number;
          productId: string;
          warehouseId: string;
        }>
      >`
        SELECT id, status, "expiresAt", quantity, "productId", "warehouseId"
        FROM "Reservation"
        WHERE id = ${params.id}
        FOR UPDATE
      `;

      if (!reservation) throw new ReservationNotFoundError();

      if (reservation.status === "CONFIRMED") {
        // Already confirmed — idempotent no-op
        return tx.reservation.findUniqueOrThrow({
          where: { id: params.id },
          include: {
            product: { select: { id: true, name: true, sku: true, priceInCents: true, imageUrl: true } },
            warehouse: { select: { id: true, name: true, location: true } },
          },
        });
      }

      if (reservation.status === "RELEASED") {
        throw new ReservationInvalidStateError(
          "This reservation has already been released."
        );
      }

      // Check expiry — 410 Gone
      if (new Date(reservation.expiresAt) < new Date()) {
        // Auto-release the reserved stock since it expired
        await tx.$executeRaw`
          UPDATE "StockLevel"
          SET reserved = GREATEST(0, reserved - ${reservation.quantity})
          WHERE "productId" = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `;
        await tx.reservation.update({
          where: { id: params.id },
          data: { status: "RELEASED" },
        });
        throw new ReservationExpiredError();
      }

      // Confirm: keep reserved count as-is (stock is sold)
      // In a real system you'd move to an order record and zero out reserved
      return tx.reservation.update({
        where: { id: params.id },
        data: { status: "CONFIRMED" },
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
