import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dateInputToDate } from "@/lib/dates";
import { invoiceSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const data = invoiceSchema.parse(await request.json());
  const products = await prisma.product.findMany({ where: { id: { in: data.items.map((item) => item.productId) } } });
  const priceByProduct = new Map(products.map((product) => [product.id, product.sellingPrice]));
  const total = data.items.reduce((sum, item) => sum + item.quantity * Number(priceByProduct.get(item.productId) ?? 0), 0);
  const invoice = await prisma.invoice.create({
    data: {
      shopId: data.shopId,
      tripId: data.tripId,
      invoiceDate: dateInputToDate(data.invoiceDate),
      totalAmount: new Prisma.Decimal(total),
      items: {
        create: data.items.map((item) => {
          const unitPrice = priceByProduct.get(item.productId) ?? new Prisma.Decimal(0);
          return { productId: item.productId, quantity: item.quantity, unitPrice, lineTotal: new Prisma.Decimal(Number(unitPrice) * item.quantity) };
        })
      }
    },
    include: { items: true }
  });
  return NextResponse.json(invoice, { status: 201 });
}
