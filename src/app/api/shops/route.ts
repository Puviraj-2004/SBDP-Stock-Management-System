import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { shopSchema } from "@/lib/validations";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  return NextResponse.json(await prisma.shop.findMany({ orderBy: { name: "asc" } }));
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const data = shopSchema.parse(await request.json());
  return NextResponse.json(await prisma.shop.create({ data }), { status: 201 });
}
