import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccount, getMainAccount, updateAccount } from "@/lib/notion/accounts";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
import { notionErrorResponse } from "@/lib/notion/errors";

export const dynamic = "force-dynamic";

// Saldo inicial de la app = Accounts.InitialBalance de la cuenta principal.
//   GET → { initialBalance, accountId }   (0 / null si todavía no hay cuenta)
//   PUT { initialBalance } → idem; crea la cuenta "Principal" si no existe.

export async function GET(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });
  if (!creds.dbIds.accounts) return NextResponse.json({ error: "Falta la base Accounts" }, { status: 400 });
  try {
    const account = await getMainAccount(creds);
    return NextResponse.json({ initialBalance: account?.initialBalance ?? 0, accountId: account?.id ?? null });
  } catch (err) {
    return notionErrorResponse("accounts:opening:get", err, "No se pudo leer el saldo inicial");
  }
}

const BodySchema = z.object({
  initialBalance: z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000),
});

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
  const initialBalance = Math.round(parsed.data.initialBalance * 100) / 100;

  try {
    const existing = await getMainAccount(creds);
    // Crear la cuenta consume bloques del plan gratis de Notion: se prefiere
    // actualizar una existente. Si falla con 403 restricted_resource, el cliente
    // muestra el motivo (ver failureText en store.tsx).
    const account = existing
      ? await updateAccount(existing.id, { initialBalance }, creds)
      : await createAccount({ name: "Principal", type: "Efectivo", currency: "ARS", initialBalance }, creds);
    return NextResponse.json({ initialBalance: account.initialBalance, accountId: account.id });
  } catch (err) {
    return notionErrorResponse("accounts:opening:put", err, "No se pudo guardar el saldo inicial");
  }
}
