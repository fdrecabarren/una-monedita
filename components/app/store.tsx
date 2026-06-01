"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Category, Transaction } from "@/lib/notion/schemas";

// ---- UI domain types ----
export type TxType = "expense" | "income";

export interface UICategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TxType;
}

export interface UITx {
  id: string;
  cat: string | null;
  amount: number;
  date: Date;
  note: string;
  type: TxType;
}

export type Period = "Día" | "Semana" | "Mes" | "Año";
export type Theme = "light" | "dark";
export type DashStyle = "A" | "B" | "C";
export type Accent = "verde" | "teal" | "bosque";
export type Screen = "dashboard" | "movimientos" | "calendario" | "categorias" | "ajustes";
export type Sim = "normal" | "loading" | "empty" | "error";

interface EntryState {
  open: boolean;
  kind: TxType;
  date: Date | null;
  edit: UITx | null;
}

interface BreakdownItem {
  cat: string;
  total: number;
  name: string;
  color: string;
  icon: string;
  pct: number;
}

interface StoreValue {
  categories: UICategory[];
  byId: Record<string, UICategory>;
  transactions: UITx[];
  visibleTx: UITx[];
  breakdown: BreakdownItem[];
  totals: { income: number; expense: number; balance: number };
  period: Period;
  setPeriod: (p: Period) => void;
  month: number;
  year: number;
  ref: Date;
  navMonth: (delta: number) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  dashStyle: DashStyle;
  setDashStyle: (d: DashStyle) => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
  sim: Sim;
  setSim: (s: Sim) => void;
  loading: boolean;
  screen: Screen;
  setScreen: (s: Screen) => void;
  entry: EntryState;
  openEntry: (kind?: TxType, date?: Date | null) => void;
  openEdit: (tx: UITx) => void;
  closeEntry: () => void;
  mode?: "mobile" | "desktop";
  addTransaction: (tx: { cat: string; amount: number; date: Date; note: string }) => Promise<void>;
  updateTransaction: (
    id: string,
    patch: { cat?: string; amount?: number; date?: Date; note?: string }
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (cat: { name: string; type: TxType; icon: string; color: string }) => Promise<string>;
  updateCategory: (
    id: string,
    patch: { name?: string; type?: TxType; icon?: string; color?: string }
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const StoreCtx = createContext<StoreValue | null>(null);

// ---- mappers ----
const DEFAULT_COLOR = "#9aa0a6";

function catToUI(c: Category): UICategory {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon || "Tag",
    color: c.color || DEFAULT_COLOR,
    type: c.kind === "Ingreso" ? "income" : "expense",
  };
}

function parseDate(s: string | null): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split("T")[0].split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function txToUI(t: Transaction, byId: Record<string, UICategory>): UITx {
  const cat = t.categoryId ? byId[t.categoryId] : null;
  const type: TxType = cat ? cat.type : t.type === "Ingreso" ? "income" : "expense";
  return {
    id: t.id,
    cat: t.categoryId,
    amount: t.amount,
    date: parseDate(t.date),
    note: t.notes || "",
    type,
  };
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function StoreProvider({
  children,
  initialCategories,
  initialTransactions,
  initialYear,
  mode,
}: {
  children: ReactNode;
  initialCategories: Category[];
  initialTransactions: Transaction[];
  initialYear: number;
  mode?: "mobile" | "desktop";
}) {
  const [categories, setCategories] = useState<UICategory[]>(() =>
    initialCategories.map(catToUI)
  );

  const byId = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  // transactions cache by year (UI shape). Seeded with initial year.
  const [txByYear, setTxByYear] = useState<Record<number, UITx[]>>(() => {
    const seedById = Object.fromEntries(
      initialCategories.map((c) => [c.id, catToUI(c)])
    );
    return { [initialYear]: initialTransactions.map((t) => txToUI(t, seedById)) };
  });

  const now = new Date();
  const [period, setPeriod] = useState<Period>("Mes");
  const [month, setMonth] = useState(
    initialYear === now.getFullYear() ? now.getMonth() : 0
  );
  const [year, setYear] = useState(initialYear);
  const [loading, setLoading] = useState(false);

  const [theme, setThemeRaw] = useState<Theme>("light");
  const [dashStyle, setDashStyleRaw] = useState<DashStyle>("A");
  const [accent, setAccentRaw] = useState<Accent>("verde");
  const [sim, setSim] = useState<Sim>("normal");
  const [screen, setScreen] = useState<Screen>("dashboard");

  // hydrate prefs from localStorage (external store) — client only, runs once.
  useEffect(() => {
    const t = (localStorage.getItem("um.theme") as Theme) || "light";
    const d = (localStorage.getItem("um.dash") as DashStyle) || "A";
    const a = (localStorage.getItem("um.accent") as Accent) || "verde";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on mount
    setThemeRaw(t);
    setDashStyleRaw(d);
    setAccentRaw(a);
  }, []);

  const setTheme = useCallback((v: Theme) => {
    setThemeRaw(v);
    persist("um.theme", v);
  }, []);
  const setDashStyle = useCallback((v: DashStyle) => {
    setDashStyleRaw(v);
    persist("um.dash", v);
  }, []);
  const setAccent = useCallback((v: Accent) => {
    setAccentRaw(v);
    persist("um.accent", v);
  }, []);

  const [entry, setEntry] = useState<EntryState>({
    open: false,
    kind: "expense",
    date: null,
    edit: null,
  });
  const openEntry = useCallback(
    (kind?: TxType, date?: Date | null) =>
      setEntry({ open: true, kind: kind || "expense", date: date || null, edit: null }),
    []
  );
  const openEdit = useCallback(
    (tx: UITx) => setEntry({ open: true, kind: tx.type, date: tx.date, edit: tx }),
    []
  );
  const closeEntry = useCallback(() => setEntry((e) => ({ ...e, open: false })), []);

  const ref = useMemo(() => new Date(year, month, 15), [year, month]);

  const transactions = useMemo(() => txByYear[year] || [], [txByYear, year]);

  // fetch a year if not cached
  const ensureYear = useCallback(
    async (y: number) => {
      if (txByYear[y]) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/transactions?year=${y}`);
        const data = await res.json();
        const list: Transaction[] = data.transactions || [];
        setTxByYear((prev) => ({ ...prev, [y]: list.map((t) => txToUI(t, byId)) }));
      } catch {
        setSim("error");
      } finally {
        setLoading(false);
      }
    },
    [txByYear, byId]
  );

  const navMonth = useCallback(
    (delta: number) => {
      setSim((s) => (s === "empty" || s === "error" ? "normal" : s));
      let m = month + delta;
      let y = year;
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      if (m > 11) {
        m = 0;
        y += 1;
      }
      setMonth(m);
      setYear(y);
      if (!txByYear[y]) void ensureYear(y);
    },
    [month, year, txByYear, ensureYear]
  );

  const visibleTx = useMemo(() => {
    if (sim === "empty" || sim === "error" || sim === "loading") return [];
    return transactions.filter((t) => {
      const d = t.date;
      if (period === "Año") return d.getFullYear() === year;
      if (period === "Mes")
        return d.getFullYear() === year && d.getMonth() === month;
      if (period === "Semana") {
        const s = startOfWeek(ref);
        const e = new Date(s);
        e.setDate(s.getDate() + 7);
        return d >= s && d < e;
      }
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === ref.getDate()
      );
    });
  }, [transactions, period, month, year, ref, sim]);

  const breakdown = useMemo<BreakdownItem[]>(() => {
    const totals: Record<string, number> = {};
    let grand = 0;
    visibleTx.forEach((x) => {
      if (!x.cat || !byId[x.cat] || byId[x.cat].type !== "expense") return;
      totals[x.cat] = (totals[x.cat] || 0) + x.amount;
      grand += x.amount;
    });
    return Object.entries(totals)
      .map(([cat, total]) => ({
        cat,
        total,
        name: byId[cat].name,
        color: byId[cat].color,
        icon: byId[cat].icon,
        pct: grand ? total / grand : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [visibleTx, byId]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    visibleTx.forEach((x) => {
      if (x.type === "income") income += x.amount;
      else expense += x.amount;
    });
    return { income, expense, balance: income - expense };
  }, [visibleTx]);

  // ---- mutations ----
  const upsertTx = useCallback((y: number, tx: UITx) => {
    setTxByYear((prev) => {
      const list = prev[y] ? [...prev[y]] : [];
      const i = list.findIndex((t) => t.id === tx.id);
      if (i >= 0) list[i] = tx;
      else list.unshift(tx);
      return { ...prev, [y]: list };
    });
  }, []);

  const removeTx = useCallback((id: string) => {
    setTxByYear((prev) => {
      const out: Record<number, UITx[]> = {};
      for (const [k, list] of Object.entries(prev)) {
        out[Number(k)] = list.filter((t) => t.id !== id);
      }
      return out;
    });
  }, []);

  const addTransaction = useCallback<StoreValue["addTransaction"]>(
    async ({ cat, amount, date, note }) => {
      const category = byId[cat];
      const kind = category?.type === "income" ? "Ingreso" : "Gasto";
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: kind,
          amount,
          currency: "ARS",
          date: toISO(date),
          categoryId: cat,
          notes: note || undefined,
        }),
      });
      if (!res.ok) throw new Error("create failed");
      const created: Transaction = await res.json();
      upsertTx(date.getFullYear(), txToUI(created, byId));
    },
    [byId, upsertTx]
  );

  const updateTransaction = useCallback<StoreValue["updateTransaction"]>(
    async (id, patch) => {
      const body: Record<string, unknown> = {};
      if (patch.amount != null) body.amount = patch.amount;
      if (patch.note !== undefined) body.notes = patch.note;
      if (patch.date) body.date = toISO(patch.date);
      if (patch.cat) {
        body.categoryId = patch.cat;
        body.type = byId[patch.cat]?.type === "income" ? "Ingreso" : "Gasto";
      }
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("update failed");
      const updated: Transaction = await res.json();
      // remove from all years then re-insert (date may have changed years)
      removeTx(id);
      const ui = txToUI(updated, byId);
      upsertTx(ui.date.getFullYear(), ui);
    },
    [byId, removeTx, upsertTx]
  );

  const deleteTransaction = useCallback<StoreValue["deleteTransaction"]>(
    async (id) => {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      removeTx(id);
    },
    [removeTx]
  );

  const addCategory = useCallback<StoreValue["addCategory"]>(
    async ({ name, type, icon, color }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          kind: type === "income" ? "Ingreso" : "Gasto",
          icon,
          color,
        }),
      });
      if (!res.ok) throw new Error("create category failed");
      const created: Category = await res.json();
      const ui = catToUI(created);
      setCategories((list) => [...list, ui]);
      return ui.id;
    },
    []
  );

  const updateCategory = useCallback<StoreValue["updateCategory"]>(
    async (id, patch) => {
      const body: Record<string, unknown> = {};
      if (patch.name != null) body.name = patch.name;
      if (patch.icon != null) body.icon = patch.icon;
      if (patch.color != null) body.color = patch.color;
      if (patch.type) body.kind = patch.type === "income" ? "Ingreso" : "Gasto";
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("update category failed");
      const updated: Category = await res.json();
      const ui = catToUI(updated);
      setCategories((list) => list.map((c) => (c.id === id ? ui : c)));
    },
    []
  );

  const deleteCategory = useCallback<StoreValue["deleteCategory"]>(
    async (id) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete category failed");
      setCategories((list) => list.filter((c) => c.id !== id));
    },
    []
  );

  const value: StoreValue = {
    categories,
    byId,
    transactions,
    visibleTx,
    breakdown,
    totals,
    period,
    setPeriod,
    month,
    year,
    ref,
    navMonth,
    theme,
    setTheme,
    dashStyle,
    setDashStyle,
    accent,
    setAccent,
    sim,
    setSim,
    loading,
    screen,
    setScreen,
    entry,
    openEntry,
    openEdit,
    closeEntry,
    mode,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { toISO, parseDate };
