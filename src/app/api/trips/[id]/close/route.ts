import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { closeTripSchema } from "@/lib/validations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = closeTripSchema.parse({ ...(await request.json()), tripId: id });
  await prisma.$transaction(async (tx) => {
    const trip = await tx.loadingTrip.findUnique({ where: { id } });
    if (!trip || trip.status !== "loaded") throw new Error("Trip is not open");
    for (const row of data.returns) {
      const item = await tx.loadingTripItem.findUnique({ where: { id: row.itemId } });
      if (!item || item.tripId !== id || row.quantityReturned > item.quantityLoaded) throw new Error("Invalid return quantity");
      await tx.loadingTripItem.update({ where: { id: item.id }, data: { quantityReturned: row.quantityReturned } });
      await tx.productBatch.update({ where: { id: item.batchId }, data: { quantity: { increment: row.quantityReturned } } });
    }
    await tx.loadingTrip.update({ where: { id }, data: { status: "closed", closedAt: new Date() } });
  });
  return NextResponse.json({ ok: true });
}
