import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { getSessionOwnerId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ownerId = await getSessionOwnerId();
  if (!ownerId) redirect("/login");

  return <DashboardShell>{children}</DashboardShell>;
}
