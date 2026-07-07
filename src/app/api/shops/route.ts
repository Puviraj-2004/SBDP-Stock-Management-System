import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { shopSchema } from "@/lib/validations";

export async function GET() {
  return NextResponse.json(await prisma.shop.findMany({ orderBy: { name: "asc" } }));
}

export async function POST(request: Request) {
  const data = shopSchema.parse(await request.json());
  return NextResponse.json(await prisma.shop.create({ data }), { status: 201 });
}
