import { NextResponse } from "next/server";
import { updateTransaction, deleteTransaction } from "@/lib/notion/transactions";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { z } from "zod";

const PatchSchema = z.object({
  type: z.enum(["Gasto", "Ingreso"]).optional(),
  amount: z.number().positive().optional(),
  currency: z.enum(["ARS", "USD", "EUR", "BTC", "ETH", "USDT"]).optional(),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
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

  const { id } = await params;
  await deleteTransaction(id, creds);
  return NextResponse.json({ ok: true });
}
