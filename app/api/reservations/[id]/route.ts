import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, ReservationNotFoundError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
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

    if (!reservation) throw new ReservationNotFoundError();

    return NextResponse.json({
      ...reservation,
      expiresAt: reservation.expiresAt.toISOString(),
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    });
  } catch (err) {
    return apiError(err);
  }
}
