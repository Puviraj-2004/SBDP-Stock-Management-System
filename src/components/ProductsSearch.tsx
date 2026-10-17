"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui";

export function ProductsSearch({ defaultQuery = "" }: { defaultQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [pending, startTransition] = useTransition();
  const latestQuery = useRef(defaultQuery);
  const requestedQuery = useRef(defaultQuery);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pending && !timer.current && latestQuery.current === requestedQuery.current) {
      latestQuery.current = defaultQuery;
      requestedQuery.current = defaultQuery;
      setQuery(defaultQuery);
    }
  }, [defaultQuery, pending]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function search(value: string) {
    latestQuery.current = value;
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      requestedQuery.current = value;
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      startTransition(() => router.replace(`/products${params.size ? `?${params}` : ""}`, { scroll: false }));
    }, 300);
  }

  return (
    <div aria-busy={pending}>
      <Field label="Search products">
        <Input
          type="search"
          value={query}
          onChange={(event) => search(event.target.value)}
          placeholder="Search by name, barcode, or item code"
          aria-label="Search products by name, barcode, or item code"
        />
      </Field>
      {pending ? <p role="status" className="mt-1 text-sm text-muted">Searching...</p> : null}
    </div>
  );
}
