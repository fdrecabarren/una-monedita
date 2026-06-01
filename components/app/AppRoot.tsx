"use client";

import { StoreProvider } from "./store";
import { Shell } from "./Shell";
import type { Category, Transaction } from "@/lib/notion/schemas";

export function AppRoot({
  categories,
  transactions,
  year,
}: {
  categories: Category[];
  transactions: Transaction[];
  year: number;
}) {
  return (
    <StoreProvider initialCategories={categories} initialTransactions={transactions} initialYear={year}>
      <Shell />
    </StoreProvider>
  );
}
