import { NextResponse } from "next/server";
import { updateBudget } from "@/lib/notion/budgets";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  limit: z.number().positive().optional(),
  recurring: z.boolean().optional(),
  alertAt80: z.boolean().optional(),
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
  try {
    const budget = await updateBudget(id, parsed.data, creds);
    return NextResponse.json(budget);
  } catch (err) {
    return NextResponse.json({ error: "Error actualizando el presupuesto en Notion", detail: String(err) }, { status: 502 });
  }
}
