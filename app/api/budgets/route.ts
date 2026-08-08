import { NextResponse } from "next/server";
import { getBudgetsByMonth, createBudget } from "@/lib/notion/budgets";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? "", 10) || now.getFullYear();
  const month = parseInt(searchParams.get("month") ?? "", 10) || now.getMonth() + 1;
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "year/month inválido" }, { status: 400 });
  }
  // La DB Budgets puede no tener las props que espera el schema (no hay
  // migración para ella, a diferencia de Subscriptions). Devolvemos el detalle
  // en vez de un 500 mudo: el store degrada solo y sin presupuestos.
  try {
    const budgets = await getBudgetsByMonth(year, month, creds);
    return NextResponse.json({ budgets });
  } catch (err) {
    return NextResponse.json({ error: "Error leyendo Budgets en Notion", detail: String(err) }, { status: 502 });
  }
}

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  limit: z.number().positive(),
  currency: z.enum(["ARS", "USD", "EUR"]).default("ARS"),
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD"),
  recurring: z.boolean().default(true),
  alertAt80: z.boolean().default(true),
  categoryId: z.string().optional(),
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
  try {
    const budget = await createBudget(parsed.data, creds);
    return NextResponse.json(budget, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Error creando el presupuesto en Notion", detail: String(err) }, { status: 502 });
  }
}
