import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccount, getOpeningInfo, updateAccount } from "@/lib/notion/accounts";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
import { notionErrorResponse } from "@/lib/notion/errors";

export const dynamic = "force-dynamic";

// Saldo inicial de la app = suma de Accounts.InitialBalance (cuentas no archivadas).
//   GET → { initialBalance }   (0 si todavía no hay cuentas)
//   PUT { initialBalance } → ajusta la cuenta "Principal" (o la única cuenta) para
//   que la suma dé ese valor; si hay varias y ninguna se llama "Principal", la crea.
// 400 = el workspace no tiene base Accounts (el cliente lo toma como saldo 0).

export async function GET(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });
  if (!creds.dbIds.accounts) return NextResponse.json({ error: "Falta la base Accounts" }, { status: 400 });
  try {
    const { total } = await getOpeningInfo(creds);
    return NextResponse.json({ initialBalance: total });
  } catch (err) {
    return notionErrorResponse("accounts:opening:get", err, "No se pudo leer el saldo inicial");
  }
}

const BodySchema = z.object({
  initialBalance: z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000),
});

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function PUT(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });
  if (!creds.dbIds.accounts) return NextResponse.json({ error: "Falta la base Accounts" }, { status: 400 });
  if (!checkMutationLimit(request)) {
    return NextResponse.json({ error: "Demasiadas operaciones. Esperá un minuto." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (body === null) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const initialBalance = round2(parsed.data.initialBalance);

  try {
    const { target, others, total } = await getOpeningInfo(creds);
    // Crear una cuenta consume bloques del plan gratis de Notion: se prefiere
    // ajustar una existente. Si falla con 403 restricted_resource, el cliente
    // muestra el motivo (ver failureText en store.tsx).
    if (target) {
      await updateAccount(target.id, { initialBalance: round2(initialBalance - others) }, creds);
    } else {
      await createAccount(
        { name: "Principal", type: "Efectivo", currency: "ARS", initialBalance: round2(initialBalance - total) },
        creds
      );
    }
    return NextResponse.json({ initialBalance });
  } catch (err) {
    return notionErrorResponse("accounts:opening:put", err, "No se pudo guardar el saldo inicial");
  }
}
