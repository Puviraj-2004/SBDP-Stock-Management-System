import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { vehicleSchema } from "@/lib/validations";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  return NextResponse.json(await prisma.vehicle.findMany({ orderBy: { nameOrNumber: "asc" } }));
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const data = vehicleSchema.parse(await request.json());
  return NextResponse.json(await prisma.vehicle.create({ data }), { status: 201 });
}
