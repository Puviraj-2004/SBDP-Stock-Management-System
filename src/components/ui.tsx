import Link from "next/link";
import { forwardRef } from "react";
import { clsx } from "clsx";

export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }>(function Button({
  children,
  className,
  variant = "primary",
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary" && "bg-accent text-white hover:bg-[#185f55]",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-[#eeebe4]",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export function LinkButton({
  href,
  children,
  variant = "primary"
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition",
        variant === "primary" && "bg-accent text-white hover:bg-[#185f55]",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-[#eeebe4]"
      )}
    >
      {children}
    </Link>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={clsx(
        "h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15",
        props.className
      )}
    />
  );
});

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15",
        props.className
      )}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15",
        props.className
      )}
    />
  );
}

export function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("rounded-md border border-line bg-white p-4", className)}>{children}</section>;
}

export function Table({
  headers,
  children
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-[#ebe7dd] text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold",
        tone === "neutral" && "bg-[#e7e2d8] text-ink",
        tone === "green" && "bg-emerald-100 text-emerald-800",
        tone === "amber" && "bg-amber-100 text-amber-800",
        tone === "red" && "bg-red-100 text-red-800"
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-line bg-white p-6 text-sm text-muted">{children}</div>;
}
