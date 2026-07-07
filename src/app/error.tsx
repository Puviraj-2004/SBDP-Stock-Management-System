"use client";

import { useEffect } from "react";
import { Button, LinkButton, Panel } from "@/components/ui";

export default function AppError({
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
    <main className="flex min-h-screen items-center justify-center bg-paper p-4">
      <Panel className="w-full max-w-lg">
        <h1 className="text-xl font-semibold text-ink">Action could not be completed</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Something went wrong while saving the request. Check the entered details and try again.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>Try again</Button>
          <LinkButton href="/" variant="secondary">Dashboard</LinkButton>
        </div>
      </Panel>
    </main>
  );
}
