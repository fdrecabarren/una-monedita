import { NextResponse } from "next/server";
import { getActiveSubscriptions } from "@/lib/notion/subscriptions";
import { chargeSubscription } from "@/lib/notion/payments";
import { credsFromEnv } from "@/lib/auth/session";
import { todayISO } from "@/lib/recurrence";

export const dynamic = "force-dynamic";

// Daily cron (see vercel.json: "0 9 * * *"). Runs single-user, no session
// cookie — uses env-var Notion creds instead, auth'd via CRON_SECRET like
// Vercel's own cron docs recommend.
//
// For each Activa subscription whose NextChargeDate has arrived:
//  - AutoCreate on  → charge it now (creates the Transaction, advances dates).
//  - AutoCreate off → leave it untouched; it shows as "Por pagar" in the app
//    until the user taps Pagar. Re-running this route never double-charges,
//    since a subscription's NextChargeDate only moves forward after a charge.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const creds = credsFromEnv();
  if (!creds) {
    return NextResponse.json({ error: "Notion no configurado (env vars)" }, { status: 503 });
  }

  const today = todayISO();
  const due = (await getActiveSubscriptions(creds)).filter(
    (s) => s.nextChargeDate && s.nextChargeDate <= today
  );

  const charged: string[] = [];
  const pending: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const sub of due) {
    if (!sub.autoCreate) {
      pending.push(sub.id);
      continue;
    }
    try {
      await chargeSubscription(sub, {}, creds);
      charged.push(sub.id);
    } catch (err) {
      failed.push({ id: sub.id, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, date: today, charged, pending, failed });
}
