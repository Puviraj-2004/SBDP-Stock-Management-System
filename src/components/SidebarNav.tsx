"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Building2, CarFront, FileText, LayoutDashboard, Package, Receipt, Settings, Store, Truck } from "lucide-react";
import { clsx } from "clsx";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/products", label: "Products", icon: Package },
  { href: "/vehicles", label: "Vehicles", icon: CarFront },
  { href: "/shops", label: "Shops", icon: Store },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/trips", label: "Trips", icon: Truck },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/account", label: "Account", icon: Settings }
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  onNavigate,
  layout = "sidebar",
  collapsed = false
}: {
  onNavigate?: () => void;
  layout?: "sidebar" | "drawer";
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className={layout === "drawer" ? "grid gap-1 px-3 py-3" : collapsed ? "grid gap-1 px-2 pb-3" : "grid gap-1 px-3 pb-3"}>
      {nav.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={clsx(
              "flex items-center rounded-md border text-sm font-medium transition",
              collapsed ? "h-10 justify-center px-0 py-0" : "gap-2 px-3 py-2",
              active
                ? "border-accent bg-accent text-white shadow-sm ring-2 ring-accent/20"
                : "border-transparent text-ink hover:bg-white"
            )}
          >
            <Icon size={17} />
            {collapsed ? null : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
