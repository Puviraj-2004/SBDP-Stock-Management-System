"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { MobileNavDrawer } from "@/components/MobileNavDrawer";
import { SidebarNav } from "@/components/SidebarNav";
import { Button } from "@/components/ui";
import { logoutAction } from "@/lib/actions";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="min-h-screen bg-surface text-ink lg:grid"
      style={{ gridTemplateColumns: collapsed ? "72px 1fr" : "230px 1fr" }}
    >
      <header className="flex items-center justify-between border-b border-line bg-[#ebe7dd] px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <MobileNavDrawer />
          <BrandLogo />
        </div>
        <form action={logoutAction}>
          <Button variant="secondary" className="h-9" aria-label="Sign out">
            <LogOut size={16} />
          </Button>
        </form>
      </header>

      <aside className="hidden border-line bg-[#ebe7dd] lg:sticky lg:top-0 lg:block lg:h-screen lg:border-r">
        <div className={collapsed ? "flex justify-center px-2 py-4" : "flex items-start justify-between gap-2 px-4 py-4"}>
          {collapsed ? null : <BrandLogo />}
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-9 px-0"
            onClick={() => setCollapsed((current) => !current)}
            title={collapsed ? "Open sidebar" : "Close sidebar"}
            aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>

        <div className={collapsed ? "max-h-[calc(100vh-124px)] overflow-y-auto" : "max-h-[calc(100vh-132px)] overflow-y-auto"}>
          <SidebarNav collapsed={collapsed} />
        </div>

        <form action={logoutAction} className={collapsed ? "px-2 pt-3" : "px-3 pt-3"}>
          <Button variant="secondary" className={collapsed ? "w-full px-0" : "w-full"} title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
            {collapsed ? null : "Sign out"}
          </Button>
        </form>
      </aside>

      <main className="p-4 lg:p-6">{children}</main>
    </div>
  );
}
