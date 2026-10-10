import { NextResponse } from "next/server";
import { getConfigStatus, resolveNotionCreds } from "@/lib/auth/session";
import { getDatabaseParentPageId } from "@/lib/notion/client";

export const dynamic = "force-dynamic";

// Estado de la conexión de este dispositivo: { connected, via, remember }.
export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const host = request.headers.get("host");
  const status = await getConfigStatus(cookieHeader, host);

  // ?full=1 also resolves db IDs + the main Notion page — used by Ajustes →
  // Mantenimiento → "Datos de conexión". Skipped by default since it costs a
  // live Notion round-trip; the plain status check (used on every Ajustes
  // mount) stays cheap.
  const { searchParams } = new URL(request.url);
  if (searchParams.get("full") !== "1" || !status.connected) {
    return NextResponse.json(status);
  }

  const resolved = await resolveNotionCreds(cookieHeader, host);
  if (!resolved) return NextResponse.json(status);

  const { creds } = resolved;
  const parentPageId = await getDatabaseParentPageId(creds.dbIds.transactions, creds.token).catch(() => null);
  return NextResponse.json({ ...status, dbIds: creds.dbIds, parentPageId });
}
