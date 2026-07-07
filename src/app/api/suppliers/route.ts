import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { supplierSchema } from "@/lib/validations";

export async function GET() {
  return NextResponse.json(await prisma.supplier.findMany({ orderBy: { name: "asc" } }));
}

export async function POST(request: Request) {
  const data = supplierSchema.parse(await request.json());
  return NextResponse.json(await prisma.supplier.create({ data }), { status: 201 });
}
