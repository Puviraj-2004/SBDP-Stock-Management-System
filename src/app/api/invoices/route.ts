import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;
  await request.json().catch(() => null);
  return NextResponse.json(
    { error: "Sale invoice API is being rebuilt for vehicle stock ledger rules." },
    { status: 410 }
  );
}
