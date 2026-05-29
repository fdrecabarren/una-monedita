import { NextResponse } from "next/server";
import { updateTransaction, deleteTransaction } from "@/lib/notion/transactions";
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
  const { id } = await params;
  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const tx = await updateTransaction(id, parsed.data);
  return NextResponse.json(tx);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteTransaction(id);
  return NextResponse.json({ ok: true });
}
