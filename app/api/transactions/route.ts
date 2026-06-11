import { NextResponse } from "next/server";
import { createTransaction, getTransactionsByYear } from "@/lib/notion/transactions";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  if (Number.isNaN(year)) {
    return NextResponse.json({ error: "year inválido" }, { status: 400 });
  }
  const transactions = await getTransactionsByYear(year, creds);
  return NextResponse.json({ transactions });
}

const BodySchema = z.object({
  type: z.enum(["Gasto", "Ingreso"]),
  amount: z.number().positive(),
  currency: z
    .enum(["ARS", "USD", "EUR", "BTC", "ETH", "USDT"])
    .default("ARS"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD").optional(),
  categoryId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });
  if (!checkMutationLimit(request)) {
    return NextResponse.json({ error: "Demasiadas operaciones. Esperá un minuto." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (body === null) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, amount, currency, date, categoryId, notes } = parsed.data;
  const tx = await createTransaction({
    type,
    amount,
    currency,
    date: date ?? new Date().toISOString().split("T")[0],
    categoryId,
    notes,
  }, creds);
  return NextResponse.json(tx, { status: 201 });
}
