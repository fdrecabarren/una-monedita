import { NextResponse } from "next/server";
import { updateTransaction, deleteTransaction } from "@/lib/notion/transactions";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";

const PatchSchema = z.object({
  type: z.enum(["Gasto", "Ingreso"]).optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(["ARS", "USD", "EUR", "BTC", "ETH", "USDT"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD").optional(),
  categoryId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });
  if (!checkMutationLimit(request)) {
    return NextResponse.json({ error: "Demasiadas operaciones. Esperá un minuto." }, { status: 429 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body === null) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const tx = await updateTransaction(id, parsed.data, creds);
  return NextResponse.json(tx);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });
  if (!checkMutationLimit(request)) {
    return NextResponse.json({ error: "Demasiadas operaciones. Esperá un minuto." }, { status: 429 });
  }

  const { id } = await params;
  await deleteTransaction(id, creds);
  return NextResponse.json({ ok: true });
}
