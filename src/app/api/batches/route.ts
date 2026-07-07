import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dateInputToDate } from "@/lib/dates";
import { batchSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const data = batchSchema.parse(await request.json());
  const batch = await prisma.productBatch.create({
    data: {
      productId: data.productId,
      quantity: data.quantity,
      expiryDate: dateInputToDate(data.expiryDate),
      receivedDate: dateInputToDate(data.receivedDate)
    }
  });
  return NextResponse.json(batch, { status: 201 });
}
