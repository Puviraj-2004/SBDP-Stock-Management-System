import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { getSessionOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const owner = await getSessionOwner();
  if (!owner) redirect("/login");

  return <DashboardShell>{children}</DashboardShell>;
}
