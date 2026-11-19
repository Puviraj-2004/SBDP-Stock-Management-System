import { PageHeader } from "@/components/ui";
import { SalesRepDialog } from "@/components/SalesRepDialog";
import { SalesRepsTable } from "@/components/SalesRepsTable";
import { prisma } from "@/lib/db";

export default async function SalesRepsPage() {
  const [reps, suppliers, allProducts] = await Promise.all([
    prisma.salesRep.findMany({
      include: {
        supplier: { select: { id: true, name: true } },
        products: { select: { id: true, name: true, measurement: true } }
      },
      orderBy: [{ supplier: { name: "asc" } }, { name: "asc" }]
    }),
    prisma.supplier.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.product.findMany({
      select: { id: true, name: true, measurement: true, supplierId: true, repId: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <>
      <PageHeader
        title="Sales Representatives"
        description="Manage supplier sales reps, assign products, and track representative coverage."
        action={<SalesRepDialog suppliers={suppliers} products={allProducts} />}
      />
      <SalesRepsTable reps={reps} suppliers={suppliers} allProducts={allProducts} />
    </>
  );
}
