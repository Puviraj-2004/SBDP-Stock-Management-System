import { clsx } from "clsx";
import { Database } from "lucide-react";
import { Panel } from "@/components/ui";
import type { DatabaseUsage } from "@/lib/databaseUsage";

function formatMb(value: number) {
  if (value >= 100) {
    return value.toFixed(0);
  }

  if (value >= 10) {
    return value.toFixed(1);
  }

  return value.toFixed(2);
}

export function DatabaseUsageCard({ usage }: { usage: DatabaseUsage }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-muted">Database storage</h2>
          <div className="mt-2 text-2xl font-semibold tabular">{usage.percentUsed.toFixed(1)}%</div>
        </div>
        <div
          className={clsx(
            "flex h-9 w-9 items-center justify-center rounded-md",
            usage.status === "ok" && "bg-emerald-100 text-emerald-800",
            usage.status === "warning" && "bg-amber-100 text-amber-800",
            usage.status === "danger" && "bg-red-100 text-red-800"
          )}
          title="Database storage"
          aria-label="Database storage"
        >
          <Database size={18} />
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-[#e7e2d8]">
        <div
          className={clsx(
            "h-full rounded",
            usage.status === "ok" && "bg-emerald-600",
            usage.status === "warning" && "bg-amber-500",
            usage.status === "danger" && "bg-red-600"
          )}
          style={{ width: `${usage.percentUsed}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-muted">
        {formatMb(usage.usedMb)} MB used of {formatMb(usage.limitMb)} MB
      </div>
      {usage.status !== "ok" ? (
        <div className={clsx("mt-1 text-xs font-medium", usage.status === "warning" ? "text-amber-700" : "text-red-700")}>
          {usage.status === "warning" ? "Storage is getting high" : "Storage is almost full"}
        </div>
      ) : null}
    </Panel>
  );
}
