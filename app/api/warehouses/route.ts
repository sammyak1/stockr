import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/errors";

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(warehouses);
  } catch (err) {
    return apiError(err);
  }
}
