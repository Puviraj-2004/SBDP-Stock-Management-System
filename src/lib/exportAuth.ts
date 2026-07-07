import { getSessionOwner } from "@/lib/auth";

export async function requireExportOwner() {
  const owner = await getSessionOwner();
  if (!owner) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
