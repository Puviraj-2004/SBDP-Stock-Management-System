import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validations";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  return NextResponse.json(await prisma.product.findMany({ include: { supplier: true }, orderBy: { name: "asc" } }));
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const data = productSchema.parse(await request.json());
  const product = await prisma.product.create({
    data: { ...data, sellingPrice: new Prisma.Decimal(data.sellingPrice) }
  });
  return NextResponse.json(product, { status: 201 });
}
