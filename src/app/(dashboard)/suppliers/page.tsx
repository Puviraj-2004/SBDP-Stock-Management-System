import Link from "next/link";
import { Edit, Eye, Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { Button, Field, Input, PageHeader, Panel, Table, TextArea } from "@/components/ui";
import { createSupplierAction, deleteSupplierAction } from "@/lib/actions";
import { prisma } from "@/lib/db";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" }
  });

  return (
    <>
      <PageHeader title="Suppliers" description="Register supplier companies once and reuse them across products and trips." />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Panel>
          <h2 className="mb-3 font-semibold">Add supplier</h2>
          <form action={createSupplierAction} className="grid gap-3">
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="Contact info"><TextArea name="contactInfo" /></Field>
            <Button type="submit">Save supplier</Button>
          </form>
        </Panel>
        <Table headers={["Name", "Contact", "Products", "Actions"]}>
          {suppliers.map((supplier) => (
            <tr key={supplier.id}>
              <td className="px-3 py-2 font-medium">{supplier.name}</td>
              <td className="px-3 py-2">{supplier.contactInfo ?? "-"}</td>
              <td className="px-3 py-2 tabular">{supplier._count.products}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/suppliers/${supplier.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                    title="View supplier details"
                    aria-label={`View ${supplier.name}`}
                  >
                    <Eye size={15} />
                  </Link>
                  <Link
                    href={`/suppliers/${supplier.id}/edit`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-[#eeebe4]"
                    title="Edit supplier"
                    aria-label={`Edit ${supplier.name}`}
                  >
                    <Edit size={15} />
                  </Link>
                  {supplier._count.products === 0 ? (
                    <form action={deleteSupplierAction}>
                      <input type="hidden" name="id" value={supplier.id} />
                      <ConfirmSubmitButton
                        type="submit"
                        message={`Delete ${supplier.name}?`}
                        className="h-8 w-8 px-0"
                        title="Delete supplier"
                        aria-label={`Delete ${supplier.name}`}
                      >
                        <Trash2 size={15} />
                      </ConfirmSubmitButton>
                    </form>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}
