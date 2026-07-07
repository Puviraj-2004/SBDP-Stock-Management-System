import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tripItemSchema } from "@/lib/validations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = tripItemSchema.parse({ ...(await request.json()), tripId: id });
  const item = await prisma.$transaction(async (tx) => {
    const trip = await tx.loadingTrip.findUnique({ where: { id } });
    if (!trip || trip.status !== "loaded") throw new Error("Trip is not open for loading");
    const batch = await tx.productBatch.findUnique({ where: { id: data.batchId } });
    if (!batch || batch.quantity < data.quantityLoaded) throw new Error("Not enough stock in selected batch");
    await tx.productBatch.update({ where: { id: data.batchId }, data: { quantity: { decrement: data.quantityLoaded } } });
    return tx.loadingTripItem.create({ data });
  });
  return NextResponse.json(item, { status: 201 });
}
