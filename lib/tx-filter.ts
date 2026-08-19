// Filtro puro de la pantalla Movimientos: tipo (todos/ingreso/gasto) +
// selección de categorías. Sin dependencias de React ni del store — solo
// necesita los campos que ya trae cada transacción (type, cat, amount), así
// que acepta UITx[] directamente por tipado estructural sin importarlo
// (evitaría un ciclo store.tsx → tx-filter.ts → store.tsx).

export type TxKind = "income" | "expense";

export interface FilterableTx {
  type: TxKind;
  cat: string | null;
  amount: number;
}

export interface TxFilter {
  type: "all" | TxKind;
  cats: string[]; // ids de categoría; [] = todas
}

export const EMPTY_TX_FILTER: TxFilter = { type: "all", cats: [] };

export function applyTxFilter<T extends FilterableTx>(tx: T[], filter: TxFilter): T[] {
  return tx.filter((t) => {
    if (filter.type !== "all" && t.type !== filter.type) return false;
    if (filter.cats.length > 0 && (!t.cat || !filter.cats.includes(t.cat))) return false;
    return true;
  });
}

export function sumTotals(tx: FilterableTx[]): { income: number; expense: number; balance: number } {
  let income = 0;
  let expense = 0;
  tx.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });
  return { income, expense, balance: income - expense };
}

export function activeFilterCount(filter: TxFilter): number {
  let n = 0;
  if (filter.type !== "all") n += 1;
  if (filter.cats.length > 0) n += 1;
  return n;
}
