import { getSessionOwnerId } from "@/lib/auth";

export async function requireExportOwner() {
  const ownerId = await getSessionOwnerId();
  if (!ownerId) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
