import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getInvoicePaidAmount, paymentCountsTowardBalance, refreshInvoicePaidStatus } from "@/lib/balance";
import { dateInputToDate } from "@/lib/dates";
import { paymentSchema } from "@/lib/validations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const data = paymentSchema.parse({ ...(await request.json()), invoiceId: id, shopId: invoice.shopId });
  const paid = await getInvoicePaidAmount(id);
  const remaining = Math.max(0, Number(invoice.totalAmount) - paid);
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        shopId: data.shopId,
        invoiceId: id,
        paymentDate: dateInputToDate(data.paymentDate),
        amount: new Prisma.Decimal(data.amount),
        method: data.method,
        chequeNumber: data.method === "cheque" ? data.chequeNumber : null,
        chequeStatus: data.method === "cheque" ? data.chequeStatus ?? "pending" : null,
        notes: data.notes
      }
    });

    if (paymentCountsTowardBalance(created)) {
      const allocationAmount = Math.min(Number(created.amount), remaining);
      if (allocationAmount > 0) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: created.id,
            invoiceId: id,
            amount: new Prisma.Decimal(allocationAmount)
          }
        });
      }
    }

    return created;
  });
  await refreshInvoicePaidStatus(id);
  return NextResponse.json(payment, { status: 201 });
}
