"use client";

import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SidebarNav } from "@/components/SidebarNav";
import { Button } from "@/components/ui";
import { logoutAction } from "@/lib/actions";

export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button type="button" variant="secondary" className="h-9 w-9 px-0 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
        <Menu size={18} />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/35" type="button" onClick={() => setOpen(false)} aria-label="Close navigation" />
          <aside className="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-line bg-[#ebe7dd] shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <BrandLogo />
              <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={() => setOpen(false)} aria-label="Close navigation">
                <X size={18} />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav layout="drawer" onNavigate={() => setOpen(false)} />
            </div>
            <form action={logoutAction} className="border-t border-line px-3 py-3">
              <Button variant="secondary" className="w-full" aria-label="Sign out">
                <LogOut size={16} />
                Sign out
              </Button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
