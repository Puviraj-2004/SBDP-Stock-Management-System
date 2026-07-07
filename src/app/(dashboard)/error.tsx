"use client";

import { useEffect } from "react";
import { Button, LinkButton, Panel } from "@/components/ui";

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Panel>
      <h1 className="text-xl font-semibold text-ink">Could not finish this action</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        The request was stopped before saving. Check the form details, stock links, or related records and try again.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={reset}>Try again</Button>
        <LinkButton href="/" variant="secondary">Dashboard</LinkButton>
      </div>
    </Panel>
  );
}
