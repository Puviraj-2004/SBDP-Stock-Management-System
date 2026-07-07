import Link from "next/link";
import { Download } from "lucide-react";
import { clsx } from "clsx";

export function ExportButton({
  href,
  children,
  className
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink transition hover:bg-[#eeebe4]",
        className
      )}
    >
      <Download size={16} />
      {children}
    </Link>
  );
}
