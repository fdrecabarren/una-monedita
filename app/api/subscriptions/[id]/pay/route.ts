import { NextResponse } from "next/server";
import { getSubscriptionById } from "@/lib/notion/subscriptions";
import { chargeSubscription } from "@/lib/notion/payments";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().optional(),
});

// Manual "Pagar" button: registers a Transaction for this subscription right
// now (or on a given date/amount) and advances NextChargeDate. Same charging
// logic the cron uses for AutoCreate items — see lib/notion/payments.ts.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });
  if (!checkMutationLimit(request)) {
    return NextResponse.json({ error: "Demasiadas operaciones. Esperá un minuto." }, { status: 429 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sub = await getSubscriptionById(id, creds);
  if (!sub) return NextResponse.json({ error: "Recurrente no encontrado" }, { status: 404 });

  const result = await chargeSubscription(sub, parsed.data, creds);
  return NextResponse.json(result, { status: 201 });
}
