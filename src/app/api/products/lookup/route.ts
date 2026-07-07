import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim();
  const supplierId = searchParams.get("supplierId")?.trim();

  if (!code) {
    return NextResponse.json({ matches: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      ...(supplierId ? { supplierId } : {}),
      OR: [{ barcode: code }, { itemCode: code }]
    },
    include: { supplier: true },
    orderBy: { name: "asc" }
  });

  if (products.length === 0) {
    return NextResponse.json({
      matches: [],
      createUrl: `/products/new?code=${encodeURIComponent(code)}`
    });
  }

  return NextResponse.json({ matches: products });
}
