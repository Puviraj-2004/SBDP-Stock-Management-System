import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { dateInputToDate } from "@/lib/dates";
import { batchSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  const data = batchSchema.parse(await request.json());
  const batch = await prisma.productBatch.create({
    data: {
      productId: data.productId,
      receivedQuantity: data.receivedQuantity,
      costPrice: data.costPrice,
      expiryDate: dateInputToDate(data.expiryDate),
      receivedDate: dateInputToDate(data.receivedDate)
    }
  });
  return NextResponse.json(batch, { status: 201 });
}
