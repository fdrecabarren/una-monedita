import { NextResponse } from "next/server";
import { getSubscriptions, createSubscription } from "@/lib/notion/subscriptions";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
import { firstChargeDate } from "@/lib/recurrence";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const subs = await getSubscriptions(
    status === "Activa" || status === "Pausada" || status === "Cancelada" ? status : undefined,
    creds
  );
  return NextResponse.json(subs);
}

const FrequencySchema = z.enum([
  "Diaria", "Semanal", "Mensual", "Bimestral", "Trimestral", "Semestral", "Anual", "Personalizada",
]);

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["Gasto", "Ingreso"]).default("Gasto"),
  amount: z.number().positive(),
  currency: z.enum(["ARS", "USD", "EUR", "BTC", "ETH", "USDT"]).default("ARS"),
  frequency: FrequencySchema,
  customIntervalDays: z.number().int().positive().optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nextChargeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  alertDaysBefore: z.number().int().min(0).max(30).default(3),
  autoCreate: z.boolean().default(false),
  accountId: z.string().optional(),
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
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // If the caller didn't pin an explicit next charge date, derive the first
  // one from startDate (respecting dueDay for monthly-family frequencies).
  const nextChargeDate =
    data.nextChargeDate ??
    firstChargeDate(data.startDate, data.frequency, data.customIntervalDays, data.dueDay);

  const sub = await createSubscription({ ...data, nextChargeDate }, creds);
  return NextResponse.json(sub, { status: 201 });
}
