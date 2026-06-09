import { NextResponse } from "next/server";
import { getConfigStatus } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = await getConfigStatus(request.headers.get("cookie") ?? "");
  return NextResponse.json(status);
}
