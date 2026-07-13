import "server-only";

import { NextResponse } from "next/server";
import { getSessionOwnerId } from "@/lib/auth";

export async function requireApiAuth() {
  const ownerId = await getSessionOwnerId();
  if (ownerId) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
