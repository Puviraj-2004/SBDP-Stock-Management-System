import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { supplierSchema } from "@/lib/validations";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  return NextResponse.json(await prisma.supplier.findMany({ orderBy: { name: "asc" } }));
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const data = supplierSchema.parse(await request.json());
  return NextResponse.json(await prisma.supplier.create({ data }), { status: 201 });
}
