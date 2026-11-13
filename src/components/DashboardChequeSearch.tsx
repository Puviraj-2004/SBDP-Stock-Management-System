"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Search, X } from "lucide-react";
import { getBankLogo } from "@/components/BankSelect";
import { Badge, Button, Input, Panel, Table } from "@/components/ui";
import { clearChequeAction, searchChequesAction, type ChequeSearchResult } from "@/lib/actions";
import { displayDate, money } from "@/lib/dates";

export function DashboardChequeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChequeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchChequesAction(trimmed);
        setResults(data);
        setHasSearched(true);
      } catch (error) {
        console.error("Cheque search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function handleClearSearch() {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  }

  function handleMarkCleared(chequeId: string) {
    setClearingIds((current) => new Set(current).add(chequeId));
    const formData = new FormData();
    formData.append("paymentId", chequeId);

    // Optimistic UI update
    setResults((current) =>
      current.map((row) => (row.id === chequeId ? { ...row, chequeStatus: "cleared" } : row))
    );

    startTransition(async () => {
      try {
        await clearChequeAction(formData);
      } catch (error) {
        console.error("Failed to clear cheque:", error);
      } finally {
        setClearingIds((current) => {
          const next = new Set(current);
          next.delete(chequeId);
          return next;
        });
      }
    });
  }

  return (
    <Panel className="mb-5 border-line bg-white shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-accent" />
            <h2 className="font-semibold text-ink">Cheque Search & Lookup</h2>
          </div>
          {hasSearched ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Badge tone={results.length > 0 ? "green" : "neutral"}>
                {results.length} {results.length === 1 ? "cheque" : "cheques"} found
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="relative flex items-center">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by cheque number, shop name, bank (e.g. BOC, Commercial), or amount..."
            className="pr-16 text-sm"
          />
          <div className="absolute right-2.5 flex items-center gap-1.5 text-muted">
            {isSearching ? <Loader2 size={16} className="animate-spin text-accent" /> : null}
            {query ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#eeebe4] text-muted hover:text-ink transition"
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Results Area */}
        {hasSearched && results.length > 0 ? (
          <div className="mt-2 grid gap-2">
            <Table headers={["Cheque #", "Shop", "Bank", "Cheque Date", "Amount", "Invoices", "Status", "Action"]}>
              {results.map((c) => {
                const isClearing = clearingIds.has(c.id);
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2 tabular font-semibold text-ink">
                      {c.chequeNumber && c.chequeNumber !== "-" ? c.chequeNumber : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/shops/${c.shopId}`} className="font-medium hover:text-accent underline-offset-2 hover:underline">
                        {c.shopName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {getBankLogo(c.bankName)}
                        <span>{c.bankName || "Cheque"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular text-sm">
                      {c.chequeDate ? displayDate(c.chequeDate) : "-"}
                    </td>
                    <td className="px-3 py-2 tabular font-semibold text-ink">
                      {money(c.amount)}
                    </td>
                    <td className="px-3 py-2">
                      {c.allocations.length === 0 ? (
                        <span className="text-muted text-xs">Unallocated</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {c.allocations.map((a) => (
                            <Link
                              key={a.invoiceId}
                              href={`/invoices/${a.invoiceId}`}
                              className="text-xs text-accent underline-offset-2 hover:underline"
                            >
                              {a.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={c.chequeStatus === "cleared" ? "green" : "amber"}>
                        {c.chequeStatus === "cleared" ? "Cleared" : "Pending"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {c.chequeStatus === "pending" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-7 px-2.5 text-xs font-medium"
                          onClick={() => handleMarkCleared(c.id)}
                          disabled={isClearing}
                        >
                          {isClearing ? "Clearing..." : "Clear"}
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 size={13} />
                          Realized
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          </div>
        ) : hasSearched && results.length === 0 && !isSearching ? (
          <div className="mt-1 rounded-md border border-dashed border-line bg-[#fbfaf7] p-4 text-center text-sm text-muted">
            No cheques found matching &quot;<strong className="text-ink">{query}</strong>&quot;. Try searching by Cheque Number, Shop Name, Bank, or Amount.
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
