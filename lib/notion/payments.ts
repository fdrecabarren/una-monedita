// Shared "confirm a fijo" logic — used by the manual confirm button
// (app/api/subscriptions/[id]/pay). Confirmation is always user-initiated:
// no cron, no automatic mode. Keeping this in one place avoids drift if more
// call sites appear later.
import type { NotionCreds } from "@/lib/auth/session";
import { createTransaction, deleteTransaction } from "./transactions";
import { updateSubscription } from "./subscriptions";
import { addInterval } from "@/lib/recurrence";
import type { Subscription, Transaction } from "./schemas";

export interface ChargeResult {
  subscription: Subscription;
  transaction: Transaction;
}

// Confirms `sub` for the period covered by its current NextChargeDate,
// registering the Transaction on the date the user chose (`opts.date`).
// Advances exactly one period from the covered due date (not from the
// payment date) — if several periods are overdue, each must be confirmed
// separately and the fijo stays in "Por pagar" in between. Auto-cancels if
// EndDate has passed.
export async function chargeSubscription(
  sub: Subscription,
  opts: { date: string; amount?: number; categoryId?: string; notes?: string },
  creds?: NotionCreds
): Promise<ChargeResult> {
  const covered = (sub.nextChargeDate ?? opts.date).slice(0, 10);
  const nextChargeDate = addInterval(covered, sub.frequency, sub.customIntervalDays, sub.dueDay);
  const pastEnd = !!sub.endDate && nextChargeDate > sub.endDate.slice(0, 10);

  const transaction = await createTransaction(
    {
      type: sub.type === "Ingreso" ? "Ingreso" : "Gasto",
      amount: opts.amount ?? sub.amount,
      currency: sub.currency ?? "ARS",
      date: opts.date,
      accountId: sub.accountId ?? undefined,
      categoryId: opts.categoryId ?? sub.categoryId ?? undefined,
      subscriptionId: sub.id,
      notes: opts.notes ?? sub.name,
    },
    creds
  );

  try {
    const updated = await updateSubscription(
      sub.id,
      {
        lastChargedDate: opts.date,
        nextChargeDate,
        ...(pastEnd ? { status: "Cancelada" as const } : {}),
      },
      creds
    );
    return { subscription: updated, transaction };
  } catch (err) {
    // Compensar: sin esto un reintento duplicaría el gasto.
    await deleteTransaction(transaction.id, creds).catch(() => {});
    throw err;
  }
}
