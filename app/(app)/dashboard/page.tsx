import { getTransactionsByYear } from "@/lib/notion/transactions";
import { getCategories } from "@/lib/notion/categories";
import { AppRoot } from "@/components/app/AppRoot";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const year = new Date().getFullYear();
  const [categories, transactions] = await Promise.all([
    getCategories().catch(() => []),
    getTransactionsByYear(year).catch(() => []),
  ]);
  return <AppRoot categories={categories} transactions={transactions} year={year} />;
}
