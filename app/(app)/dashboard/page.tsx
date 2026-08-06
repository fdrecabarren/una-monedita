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
  if (creds) {
    [categories, transactions, subscriptions] = await Promise.all([
      getCategories(undefined, creds).catch((err) => {
        console.error("[dashboard] getCategories failed:", err);
        return [] as Category[];
      }),
      getTransactionsByYear(year, creds).catch((err) => {
        console.error("[dashboard] getTransactionsByYear failed:", err);
        return [] as Transaction[];
      }),
      getSubscriptions(undefined, creds).catch((err) => {
        console.error("[dashboard] getSubscriptions failed:", err);
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
    />
  );
}
