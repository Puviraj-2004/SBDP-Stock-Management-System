import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

function pageHref(pathname: string, page: number, params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) search.set(key, value);
  }

  if (page > 1) {
    search.set("page", String(page));
  } else {
    search.delete("page");
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function PaginationControls({
  pathname,
  page,
  pageCount,
  total,
  pageSize,
  params
}: {
  pathname: string;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  params?: Record<string, string | undefined>;
}) {
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(pageCount, page + 1);
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm">
      <div className="text-muted">
        Showing <span className="font-medium text-ink">{firstItem}-{lastItem}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={pageHref(pathname, previousPage, params)}
          aria-disabled={page <= 1}
          className={clsx(
            "inline-flex h-9 items-center gap-1 rounded-md border border-line px-3 font-medium transition",
            page <= 1 ? "pointer-events-none bg-[#f4f0e8] text-muted" : "bg-white text-ink hover:bg-[#eeebe4]"
          )}
        >
          <ChevronLeft size={15} />
          Prev
        </Link>
        <span className="min-w-20 text-center text-muted">
          {page} / {pageCount}
        </span>
        <Link
          href={pageHref(pathname, nextPage, params)}
          aria-disabled={page >= pageCount}
          className={clsx(
            "inline-flex h-9 items-center gap-1 rounded-md border border-line px-3 font-medium transition",
            page >= pageCount ? "pointer-events-none bg-[#f4f0e8] text-muted" : "bg-white text-ink hover:bg-[#eeebe4]"
          )}
        >
          Next
          <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  );
}
