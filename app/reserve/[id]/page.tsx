import { notFound } from "next/navigation";
import { ReservationClient } from "@/components/ReservationClient";

async function getReservation(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/reservations/${id}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load reservation");
  return res.json();
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
