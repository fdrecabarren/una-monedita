import { cookies } from "next/headers";
import { getTransactionsByYear } from "@/lib/notion/transactions";
import { getCategories } from "@/lib/notion/categories";
import { getSubscriptions } from "@/lib/notion/subscriptions";
import { getNotionCredsFromCookieString } from "@/lib/auth/session";
import type { Category, Transaction, Subscription } from "@/lib/notion/schemas";
import { AppRoot } from "@/components/app/AppRoot";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const year = new Date().getFullYear();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const creds = await getNotionCredsFromCookieString(cookieHeader);

  let categories: Category[] = [];
  let transactions: Transaction[] = [];
  let subscriptions: Subscription[] = [];
  // Un fetch fallido NO es lo mismo que "no hay datos": si Notion devuelve 401 o
  // se cae la red, devolver [] hace que la app diga "no registraste movimientos"
  // y el usuario cree que perdió su información. Se marca y se muestra error.
  let loadError = false;
  if (creds) {
    [categories, transactions, subscriptions] = await Promise.all([
      getCategories(undefined, creds).catch((err) => {
        console.error("[dashboard] getCategories failed:", err);
        loadError = true;
        return [] as Category[];
      }),
      getTransactionsByYear(year, creds).catch((err) => {
        console.error("[dashboard] getTransactionsByYear failed:", err);
        loadError = true;
        return [] as Transaction[];
      }),
      getSubscriptions(undefined, creds).catch((err) => {
        console.error("[dashboard] getSubscriptions failed:", err);
        loadError = true;
        return [] as Subscription[];
      }),
    ]);
  }

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
