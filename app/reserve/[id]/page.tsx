import { notFound } from "next/navigation";
import { ReservationClient } from "@/components/ReservationClient";
import { prisma } from "@/lib/db";

async function getReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true, sku: true, priceInCents: true, imageUrl: true } },
      warehouse: { select: { id: true, name: true, location: true } },
    },
  });
  if (!reservation) return null;
  return {
    ...reservation,
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

export default async function ReservationPage({
  params,
}: {
  params: { id: string };
}) {
  const reservation = await getReservation(params.id);

  if (!reservation) notFound();

  return <ReservationClient initialReservation={reservation} />;
}
