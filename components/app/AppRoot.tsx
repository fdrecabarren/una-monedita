"use client";

import { StoreProvider } from "./store";
import { Shell } from "./Shell";
import type { Category, Transaction, Subscription } from "@/lib/notion/schemas";

export function AppRoot({
  categories,
  transactions,
  subscriptions,
  year,
  loadError,
}: {
  categories: Category[];
  transactions: Transaction[];
  subscriptions?: Subscription[];
  year: number;
  loadError?: boolean;
}) {
  return (
    <StoreProvider
      initialCategories={categories}
      initialTransactions={transactions}
      initialSubscriptions={subscriptions}
      initialYear={year}
      initialLoadError={loadError}
    >
      <Shell />
    </StoreProvider>
  );
}
