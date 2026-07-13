"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  CarFront,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Store,
  Wallet
} from "lucide-react";
import { clsx } from "clsx";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  activePaths?: string[];
  excludePaths?: string[];
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const dashboardItem: NavItem = { href: "/", label: "Dashboard", icon: LayoutDashboard };

const mainGroups: NavGroup[] = [
  {
    label: "Catalog",
    items: [
      { href: "/suppliers", label: "Suppliers", icon: Building2 },
      { href: "/vehicles", label: "Vehicles", icon: CarFront },
      { href: "/products", label: "Products", icon: Package },
      { href: "/shops", label: "Shops", icon: Store }
    ]
  },
  {
    label: "Operations",
    items: [
      { href: "/stock", label: "Stock / Batches", icon: Package },
      { href: "/operations/vehicle-stock", label: "Vehicle load", icon: Boxes }
    ]
  },
  {
    label: "Sales",
    items: [
      { href: "/invoices", label: "Invoices", icon: Receipt },
      { href: "/payments", label: "Payments", icon: Wallet }
    ]
  }
];

const reportsGroup: NavGroup = {
  label: "Reports",
  items: [
    { href: "/reports/daily", label: "Daily report", icon: FileText, activePaths: ["/reports", "/reports/daily"], exact: true },
    { href: "/reports/monthly", label: "Monthly report", icon: BarChart3, activePaths: ["/reports/month", "/reports/monthly"] }
  ]
};

const accountItem: NavItem = { href: "/account", label: "Account", icon: Settings };
const allGroups = [...mainGroups, reportsGroup];

function isActive(pathname: string, item: NavItem) {
  if (item.excludePaths?.some((href) => pathname === href || pathname.startsWith(`${href}/`))) return false;
  const paths = item.activePaths ?? [item.href];
  return paths.some((href) => {
    if (href === "/") return pathname === "/";
    if (item.exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  });
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
  inset = false
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  inset?: boolean;
}) {
  const Icon = item.icon;
  const className = clsx(
    "flex items-center rounded-md border text-sm font-medium transition",
    collapsed ? "h-10 justify-center px-0 py-0" : inset ? "gap-2 px-3 py-2 pl-8" : "gap-2 px-3 py-2",
    active
      ? "border-accent bg-accent text-white shadow-sm ring-2 ring-accent/20"
      : "border-transparent text-ink hover:bg-white"
  );
  const content = (
    <>
      <Icon size={17} />
      {collapsed ? null : item.label}
    </>
  );

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={className}
    >
      {content}
    </Link>
  );
}

function NavGroupSection({
  group,
  open,
  pathname,
  onNavigate,
  onToggle
}: {
  group: NavGroup;
  open: boolean;
  pathname: string;
  onNavigate?: () => void;
  onToggle: () => void;
}) {
  const active = group.items.some((item) => isActive(pathname, item));

  return (
    <section className="grid gap-1">
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          "flex items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-normal transition",
          active ? "text-accent" : "text-muted hover:bg-white hover:text-ink"
        )}
        aria-expanded={open}
      >
        <span>{group.label}</span>
        <ChevronDown size={15} className={clsx("transition", open ? "rotate-0" : "-rotate-90")} />
      </button>
      {open ? (
        <div className="grid gap-1">
          {group.items.map((item) => (
            <NavLink
              key={`${group.label}-${item.href}`}
              item={item}
              active={isActive(pathname, item)}
              collapsed={false}
              onNavigate={onNavigate}
              inset
            />
          ))}
        </div>
      ) : null}
    </section>
  );
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
  const defaultOpenGroups = useMemo(
    () => Object.fromEntries(allGroups.map((group) => [group.label, true])),
    []
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpenGroups);

  if (collapsed) {
    const flatItems = [
      dashboardItem,
      ...mainGroups.flatMap((group) => group.items),
      ...reportsGroup.items
    ];

    return (
      <nav className="flex h-full flex-col px-2 pb-3">
        <div className="grid gap-1">
          {flatItems.map((item) => (
            <NavLink key={`${item.label}-${item.href}`} item={item} active={isActive(pathname, item)} collapsed onNavigate={onNavigate} />
          ))}
        </div>
        <div className="mt-auto grid gap-1 border-t border-line pt-3">
          <NavLink item={accountItem} active={isActive(pathname, accountItem)} collapsed onNavigate={onNavigate} />
        </div>
      </nav>
    );
  }

  return (
    <nav className={clsx("flex h-full flex-col", layout === "drawer" ? "px-3 py-3" : "px-3 pb-3")}>
      <div className="grid gap-3">
        <div className="grid gap-1">
          <NavLink item={dashboardItem} active={isActive(pathname, dashboardItem)} collapsed={false} onNavigate={onNavigate} />
        </div>

        {mainGroups.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            open={openGroups[group.label] ?? true}
            pathname={pathname}
            onNavigate={onNavigate}
            onToggle={() => setOpenGroups((current) => ({ ...current, [group.label]: !(current[group.label] ?? true) }))}
          />
        ))}

        <NavGroupSection
          group={reportsGroup}
          open={openGroups[reportsGroup.label] ?? true}
          pathname={pathname}
          onNavigate={onNavigate}
          onToggle={() => setOpenGroups((current) => ({ ...current, [reportsGroup.label]: !(current[reportsGroup.label] ?? true) }))}
        />
      </div>

      <div className="mt-auto grid gap-1 border-t border-line pt-3">
        <NavLink item={accountItem} active={isActive(pathname, accountItem)} collapsed={false} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}
