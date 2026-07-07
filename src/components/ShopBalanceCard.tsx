import { money } from "@/lib/dates";

export function ShopBalanceCard({ balance }: { balance: number }) {
  const settled = balance <= 0;
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="text-sm font-medium text-muted">Outstanding balance</div>
      <div className={`mt-1 text-3xl font-semibold tabular ${settled ? "text-emerald-700" : "text-red-700"}`}>
        {money(balance)}
      </div>
      <div className="mt-1 text-xs text-muted">
        Cash and bank payments reduce this immediately. Cheques count only after clearing.
      </div>
    </div>
  );
}
