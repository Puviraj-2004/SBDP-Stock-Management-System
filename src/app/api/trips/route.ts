import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dateInputToDate } from "@/lib/dates";
import { tripSchema } from "@/lib/validations";

export async function GET() {
  return NextResponse.json(await prisma.loadingTrip.findMany({ include: { vehicle: true, supplier: true }, orderBy: { tripDate: "desc" } }));
}

export async function POST(request: Request) {
  const data = tripSchema.parse(await request.json());
  const trip = await prisma.loadingTrip.create({
    data: { vehicleId: data.vehicleId, supplierId: data.supplierId, tripDate: dateInputToDate(data.tripDate) }
  });
  return NextResponse.json(trip, { status: 201 });
}
