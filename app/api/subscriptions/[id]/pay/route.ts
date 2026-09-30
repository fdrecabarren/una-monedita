import { NextResponse } from "next/server";
import { getSubscriptionById } from "@/lib/notion/subscriptions";
import { chargeSubscription } from "@/lib/notion/payments";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
import { notionErrorResponse } from "@/lib/notion/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const BodySchema = z.object({
  date: z.string().regex(ISO), // obligatoria: la elige el usuario en el modal
  expectedNext: z.string().regex(ISO).nullable(), // NextChargeDate que vio el cliente
  amount: z.number().positive().optional(),
  categoryId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Botón "Confirmar" de un fijo: registra una Transaction con la fecha que
// eligió el usuario y avanza NextChargeDate un período. No hay cron ni modo
// automático — toda confirmación pasa por acá.
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
  const body = await request.json().catch(() => null);
  if (body === null) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sub = await getSubscriptionById(id, creds);
  if (!sub) return NextResponse.json({ error: "Recurrente no encontrado" }, { status: 404 });

  // status null = fijo creado a mano en Notion sin Status: la UI lo trata como
  // Activa (`subToUI`), así que acá también.
  if (sub.status && sub.status !== "Activa") {
    return NextResponse.json({ error: "El fijo no está activo", subscription: sub }, { status: 409 });
  }
  const currentNext = sub.nextChargeDate?.slice(0, 10) ?? null;
  if (currentNext !== parsed.data.expectedNext) {
    return NextResponse.json({ error: "Este fijo ya se confirmó", subscription: sub }, { status: 409 });
  }

  try {
    const result = await chargeSubscription(sub, parsed.data, creds);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return notionErrorResponse("subscriptions:pay", err, "No se pudo registrar en Notion");
  }
}
