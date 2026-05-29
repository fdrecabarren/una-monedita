import { NextResponse } from "next/server";
import { createTransaction } from "@/lib/notion/transactions";
import { z } from "zod";

const BodySchema = z.object({
  type: z.enum(["Gasto", "Ingreso"]),
  amount: z.number().positive(),
  currency: z
    .enum(["ARS", "USD", "EUR", "BTC", "ETH", "USDT"])
    .default("ARS"),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
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
  });
  return NextResponse.json(tx, { status: 201 });
}
