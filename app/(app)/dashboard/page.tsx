import { cookies } from "next/headers";
import { getTransactionsByYear } from "@/lib/notion/transactions";
import { getCategories } from "@/lib/notion/categories";
import { getNotionCredsFromCookieString } from "@/lib/auth/session";
import type { Category, Transaction } from "@/lib/notion/schemas";
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
  if (creds) {
    [categories, transactions] = await Promise.all([
      getCategories(undefined, creds).catch((err) => {
        console.error("[dashboard] getCategories failed:", err);
        return [] as Category[];
      }),
      getTransactionsByYear(year, creds).catch((err) => {
        console.error("[dashboard] getTransactionsByYear failed:", err);
        return [] as Transaction[];
      }),
    ]);
  }

  return <AppRoot categories={categories} transactions={transactions} year={year} />;
}
