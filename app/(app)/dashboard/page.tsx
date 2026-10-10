import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTransactionsByYear } from "@/lib/notion/transactions";
import { getCategories } from "@/lib/notion/categories";
import { getSubscriptions } from "@/lib/notion/subscriptions";
import { resolveNotionCreds } from "@/lib/auth/session";
import { isNotionUnauthorized } from "@/lib/notion/errors";
import type { Category, Transaction, Subscription } from "@/lib/notion/schemas";
import { AppRoot } from "@/components/app/AppRoot";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const year = new Date().getFullYear();
  // El header crudo (no cookies().getAll()): el proxy puede haberlo reescrito en este
  // mismo pedido al migrar una sesión vieja.
  const h = await headers();
  const resolved = await resolveNotionCreds(h.get("cookie") ?? "", h.get("host"));
  // El proxy ya manda a /setup sin credenciales; esto cubre cualquier salto de él.
  if (!resolved) redirect("/setup?reason=missing");
  const { creds } = resolved;

  const [cats, txs, subs] = await Promise.allSettled([
    getCategories(undefined, creds),
    getTransactionsByYear(year, creds),
    getSubscriptions(undefined, creds),
  ]);
  const categories: Category[] = cats.status === "fulfilled" ? cats.value : [];
  const transactions: Transaction[] = txs.status === "fulfilled" ? txs.value : [];
  const subscriptions: Subscription[] = subs.status === "fulfilled" ? subs.value : [];

  // Un fetch fallido NO es lo mismo que "no hay datos": si Notion devuelve 401 o
  // se cae la red, devolver [] hace que la app diga "no registraste movimientos"
  // y el usuario cree que perdió su información. Se marca y se muestra error.
  const failures = [cats, txs, subs].filter((r): r is PromiseRejectedResult => r.status === "rejected");
  failures.forEach((r) => console.error("[dashboard] load failed:", r.reason));
  const loadError = failures.length > 0;
  // Notion rechazó el token (regenerado, revocado o la página ya no se comparte con
  // la integración): reconectar, no mostrar un error genérico.
  if (failures.some((r) => isNotionUnauthorized(r.reason))) redirect("/setup?reason=revoked");

  return (
    <AppRoot
      categories={categories}
      transactions={transactions}
      subscriptions={subscriptions}
      year={year}
      loadError={loadError}
    />
  );
}
