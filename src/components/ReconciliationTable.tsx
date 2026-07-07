import { Badge, Table } from "@/components/ui";
import { getTripReconciliation } from "@/lib/reconciliation";

export async function ReconciliationTable({ tripId }: { tripId: string }) {
  const reconciliation = await getTripReconciliation(tripId);
  const allMatched = reconciliation.mismatchCount === 0;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Reconciliation</h2>
        <Badge tone={allMatched ? "green" : "red"}>
          {allMatched ? "All matched" : `${reconciliation.mismatchCount} items need review`}
        </Badge>
      </div>
      <Table headers={["Product", "Expected sold", "Billed", "Mismatch"]}>
        {reconciliation.rows.map((row) => (
          <tr key={row.productId} className={row.mismatch !== 0 ? "bg-red-50" : undefined}>
            <td className="px-3 py-2">
              <div className="font-medium">{row.productName} {row.measurement}</div>
              <div className="text-xs text-muted">{row.supplierName}</div>
            </td>
            <td className="px-3 py-2 tabular">{row.expectedSold}</td>
            <td className="px-3 py-2 tabular">{row.totalBilled}</td>
            <td className="px-3 py-2 tabular">
              <Badge tone={row.mismatch === 0 ? "green" : "red"}>{row.mismatch}</Badge>
            </td>
          </tr>
        ))}
        <tr className="bg-[#ebe7dd] font-semibold">
          <td className="px-3 py-2">Trip total</td>
          <td className="px-3 py-2 tabular">{reconciliation.expectedTotal}</td>
          <td className="px-3 py-2 tabular">{reconciliation.billedTotal}</td>
          <td className="px-3 py-2 tabular">{reconciliation.expectedTotal - reconciliation.billedTotal}</td>
        </tr>
      </Table>
    </div>
  );
}
