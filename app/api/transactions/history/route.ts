import { NextResponse } from "next/server";
import { getTransactionsBefore } from "@/lib/notion/transactions";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { notionErrorResponse } from "@/lib/notion/errors";

export const dynamic = "force-dynamic";
// El historial largo se pagina en serie (unos 0.3-0.6 s por página de 100).
export const maxDuration = 60;

// GET /api/transactions/history?before=YYYY-MM-DD → { transactions }
// Todos los movimientos con fecha anterior a `before` (exclusivo). Es lo que el
// cliente necesita para calcular el saldo arrastrado: los años recientes ya los
// carga por separado con /api/transactions?year=.
export async function GET(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });

  const before = new URL(request.url).searchParams.get("before");
  if (!before || !/^\d{4}-\d{2}-\d{2}$/.test(before)) {
    return NextResponse.json({ error: "before inválido (YYYY-MM-DD)" }, { status: 400 });
  }
  try {
    const transactions = await getTransactionsBefore(before, creds);
    return NextResponse.json({ transactions });
  } catch (err) {
    return notionErrorResponse("transactions:history", err, "No se pudo cargar el historial");
  }
}
