"use client";

import { StoreProvider, useStore } from "./store";
import { Shell } from "./Shell";
import type { Category, Transaction, Subscription } from "@/lib/notion/schemas";

function Toast() {
  const { notice } = useStore();
  if (!notice) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 86,
        transform: "translateX(-50%)",
        zIndex: 80,
        padding: "11px 18px",
        borderRadius: 14,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-card)",
        color: "var(--red-600)",
        fontWeight: 700,
        fontSize: 14,
        maxWidth: "90vw",
        whiteSpace: "nowrap",
      }}
    >
      {notice}
    </div>
  );
}

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
      <Toast />
    </StoreProvider>
  );
}
