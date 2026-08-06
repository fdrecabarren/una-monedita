import { NextResponse } from "next/server";
import { getDatabaseSchema, updateDatabaseSchema } from "@/lib/notion/client";
import { getNotionCredsFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Properties the "recurrentes" feature needs on the Subscriptions DB, on top
// of what the original template already ships (Name/Amount/Currency/
// Frequency/CustomIntervalDays/StartDate/NextChargeDate/AlertDaysBefore/
// Status/Notes/Account/Category).
const REQUIRED_PROPS: Record<string, unknown> = {
  Type: { select: { options: [{ name: "Gasto", color: "red" }, { name: "Ingreso", color: "green" }] } },
  DueDay: { number: { format: "number" } },
  AutoCreate: { checkbox: {} },
  LastChargedDate: { date: {} },
  EndDate: { date: {} },
};

// Idempotent: only PATCHes properties that don't already exist on the
// database. Safe to call repeatedly (e.g. re-run after adding a new field
// here in the future) — never touches or removes existing properties.
export async function POST(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });

  const dbId = creds.dbIds.subscriptions;
  const schema = await getDatabaseSchema(dbId, creds.token);
  const existing = new Set(Object.keys(schema.properties));

  const missing: Record<string, unknown> = {};
  for (const [name, def] of Object.entries(REQUIRED_PROPS)) {
    if (!existing.has(name)) missing[name] = def;
  }

  if (Object.keys(missing).length === 0) {
    return NextResponse.json({ ok: true, added: [] });
  }

  await updateDatabaseSchema(dbId, missing, creds.token);
  return NextResponse.json({ ok: true, added: Object.keys(missing) });
}
