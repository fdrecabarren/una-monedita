// Shared "charge a recurring subscription" logic — used by both the manual
// pay button (app/api/subscriptions/[id]/pay) and the daily cron
// (app/api/cron/subscriptions). Keeping this in one place avoids the two
// call sites drifting on how a subscription advances after being charged.
import type { NotionCreds } from "@/lib/auth/session";
import { createTransaction } from "./transactions";
import { updateSubscription } from "./subscriptions";
import { nextChargeAfter, todayISO } from "@/lib/recurrence";
import type { Subscription, Transaction } from "./schemas";

export interface ChargeResult {
  subscription: Subscription;
  transaction: Transaction;
}

// Charges `sub` on `date` (default: today) for `amount` (default: sub.amount),
// creates the corresponding Transaction linked via `subscriptionId`, advances
// NextChargeDate/LastChargedDate, and auto-cancels if EndDate has passed.
export async function chargeSubscription(
  sub: Subscription,
  opts: { date?: string; amount?: number } = {},
  creds?: NotionCreds
): Promise<ChargeResult> {
  const date = opts.date ?? todayISO();
  const amount = opts.amount ?? sub.amount;

  const transaction = await createTransaction(
    {
      type: sub.type === "Ingreso" ? "Ingreso" : "Gasto",
      amount,
      currency: sub.currency ?? "ARS",
      date,
      accountId: sub.accountId ?? undefined,
      categoryId: sub.categoryId ?? undefined,
      subscriptionId: sub.id,
      notes: sub.name,
    },
    creds
  );

  const nextChargeDate = nextChargeAfter(sub, date);
  const pastEnd = !!sub.endDate && nextChargeDate > sub.endDate;

  const updated = await updateSubscription(
    sub.id,
    {
      lastChargedDate: date,
      nextChargeDate,
      ...(pastEnd ? { status: "Cancelada" as const } : {}),
    },
    creds
  );

  return { subscription: updated, transaction };
}
