"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Category, Transaction, Subscription, Budget, Frequency, SubscriptionStatus, Currency } from "@/lib/notion/schemas";
import {
  type Period,
  type DateRange,
  rangeFor,
  shiftRange,
  rangeLabel as formatRangeLabel,
  comparisonRange,
  yearsIn,
  addMonthsClamped,
  startOfDay,
  endOfDay,
  startOfMonth,
  toISO,
  parseDate,
} from "@/lib/date-range";
import { type TxFilter, EMPTY_TX_FILTER } from "@/lib/tx-filter";

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

// Recurrentes (gastos/ingresos fijos). Dates stay as YYYY-MM-DD strings —
// unlike UITx, there's no per-month calendar filtering here, and the
// recurrence math in lib/recurrence.ts operates on ISO strings directly.
export interface UISub {
  id: string;
  name: string;
  type: TxType;
  amount: number;
  currency: Currency;
  frequency: Frequency;
  customIntervalDays: number | null;
  dueDay: number | null;
  startDate: string;
  nextChargeDate: string | null;
  lastChargedDate: string | null;
  endDate: string | null;
  alertDaysBefore: number;
  autoCreate: boolean;
  status: SubscriptionStatus;
  notes: string;
  cat: string | null;
}

// Presupuesto mensual por categoría (DB Budgets). `month` es el primer día del
// mes en formato ISO (YYYY-MM-01) — un presupuesto por categoría y mes.
export interface UIBudget {
  id: string;
  name: string;
  limit: number;
  currency: AppCurrency;
  month: string;
  recurring: boolean;
  alertAt80: boolean;
  categoryId: string | null;
}

export type Theme = "light" | "dark";
export type DashStyle = "A" | "B" | "C";
export type Accent = "verde" | "teal" | "bosque";
export type AppCurrency = "ARS" | "USD" | "EUR";
export type Screen = "dashboard" | "movimientos" | "calendario" | "categorias" | "recurrentes" | "ajustes";
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
  range: DateRange;
  prevRange: DateRange;
  rangeLabel: string;
  navRange: (delta: number) => void;
  setRange: (start: Date, end: Date) => void;
  prevTotals: { income: number; expense: number; balance: number };
  month: number;
  year: number;
  navMonth: (delta: number) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  dashStyle: DashStyle;
  setDashStyle: (d: DashStyle) => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
  currency: AppCurrency;
  setCurrency: (c: AppCurrency) => void;
  focus: TxType;
  setFocus: (f: TxType) => void;
  txFilter: TxFilter;
  setTxFilter: (f: TxFilter) => void;
  sim: Sim;
  setSim: (s: Sim) => void;
  loading: boolean;
  loadError: boolean;
  notice: string | null;
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
  subscriptions: UISub[];
  addSubscription: (sub: NewSubInput) => Promise<void>;
  updateSubscription: (id: string, patch: Partial<NewSubInput> & { status?: SubscriptionStatus }) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  paySubscription: (id: string, opts?: { date?: string; amount?: number }) => Promise<void>;
  budgets: UIBudget[];
  setBudget: (categoryId: string, limit: number) => Promise<void>;
}

export interface NewSubInput {
  name: string;
  type: TxType;
  amount: number;
  currency: Currency;
  frequency: Frequency;
  customIntervalDays?: number;
  dueDay?: number;
  startDate: string;
  nextChargeDate?: string;
  alertDaysBefore: number;
  autoCreate: boolean;
  cat: string | null;
  notes: string;
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

function subToUI(s: Subscription): UISub {
  return {
    id: s.id,
    name: s.name,
    type: s.type === "Ingreso" ? "income" : "expense",
    amount: s.amount,
    currency: s.currency ?? "ARS",
    frequency: s.frequency ?? "Mensual",
    customIntervalDays: s.customIntervalDays,
    dueDay: s.dueDay,
    startDate: s.startDate ?? toISO(new Date()),
    nextChargeDate: s.nextChargeDate,
    lastChargedDate: s.lastChargedDate,
    endDate: s.endDate,
    alertDaysBefore: s.alertDaysBefore,
    autoCreate: s.autoCreate,
    status: s.status ?? "Activa",
    notes: s.notes ?? "",
    cat: s.categoryId,
  };
}

function budgetToUI(b: Budget): UIBudget {
  return {
    id: b.id,
    name: b.name,
    limit: b.limit,
    currency: b.currency ?? "ARS",
    month: b.month ?? toISO(new Date()),
    recurring: b.recurring,
    alertAt80: b.alertAt80,
    categoryId: b.categoryId,
  };
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
  initialSubscriptions,
  initialYear,
  initialLoadError,
  mode,
}: {
  children: ReactNode;
  initialCategories: Category[];
  initialTransactions: Transaction[];
  initialSubscriptions?: Subscription[];
  initialYear: number;
  // El fetch del servidor falló (Notion caído, token inválido, red). Distinto de
  // "no hay datos": sin esto un 401 se dibuja como "no tenés movimientos".
  initialLoadError?: boolean;
  mode?: "mobile" | "desktop";
}) {
  const [categories, setCategories] = useState<UICategory[]>(() =>
    initialCategories.map(catToUI)
  );

  const [subscriptions, setSubscriptions] = useState<UISub[]>(() =>
    (initialSubscriptions ?? []).map(subToUI)
  );

  const [budgets, setBudgets] = useState<UIBudget[]>([]);

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
  const [periodRaw, setPeriodRaw] = useState<Period>("Mes");
  const [anchor, setAnchor] = useState<Date>(() =>
    initialYear === now.getFullYear() ? now : new Date(initialYear, 0, 1)
  );
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const month = anchor.getMonth();
  const year = anchor.getFullYear();
  const [loading, setLoading] = useState(false);

  const [theme, setThemeRaw] = useState<Theme>("light");
  const [dashStyle, setDashStyleRaw] = useState<DashStyle>("A");
  const [accent, setAccentRaw] = useState<Accent>("verde");
  const [currency, setCurrencyRaw] = useState<AppCurrency>("EUR");
  const [focus, setFocusRaw] = useState<TxType>("expense");
  // Filtro de Movimientos (tipo + categorías). A propósito NO persiste en
  // localStorage: un filtro que sobrevive al reload y esconde movimientos es
  // una trampa de UX ("¿dónde están mis datos?"). Se resetea al recargar.
  const [txFilter, setTxFilter] = useState<TxFilter>(EMPTY_TX_FILTER);
  const [sim, setSim] = useState<Sim>("normal");
  const loadError = !!initialLoadError;
  const [screen, setScreen] = useState<Screen>("dashboard");

  // hydrate prefs from localStorage (external store) — client only, runs once.
  useEffect(() => {
    const t = (localStorage.getItem("um.theme") as Theme) || "light";
    const d = (localStorage.getItem("um.dash") as DashStyle) || "A";
    const a = (localStorage.getItem("um.accent") as Accent) || "verde";
    const c = (localStorage.getItem("um.currency") as AppCurrency) || "EUR";
    const f = (localStorage.getItem("um.focus") as TxType) || "expense";
    const p = (localStorage.getItem("um.period") as Period) || "Mes";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on mount
    setThemeRaw(t);
    setDashStyleRaw(d);
    setAccentRaw(a);
    setCurrencyRaw(c);
    setFocusRaw(f);
    if (p === "Personalizado") {
      const rs = localStorage.getItem("um.rangeStart");
      const re = localStorage.getItem("um.rangeEnd");
      if (rs && re) {
        setCustomRange({ start: startOfDay(parseDate(rs)), end: endOfDay(parseDate(re)) });
        setPeriodRaw(p);
      }
      // sin rango guardado, se queda en "Mes" (default) en vez de un Personalizado vacío
    } else {
      setPeriodRaw(p);
    }
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
  const setCurrency = useCallback((v: AppCurrency) => {
    setCurrencyRaw(v);
    persist("um.currency", v);
  }, []);
  const setFocus = useCallback((v: TxType) => {
    setFocusRaw(v);
    persist("um.focus", v);
  }, []);

  const setPeriod = useCallback((p: Period) => {
    setSim((s) => (s === "empty" || s === "error" ? "normal" : s));
    setPeriodRaw(p);
    persist("um.period", p);
  }, []);

  // rango efectivo: derivado del anchor para períodos fijos, o el rango
  // custom elegido en el selector para "Personalizado" (con fallback al mes
  // actual mientras el usuario todavía no eligió fechas).
  const range = useMemo<DateRange>(() => {
    if (periodRaw === "Personalizado") return customRange ?? rangeFor("Mes", anchor);
    return rangeFor(periodRaw, anchor);
  }, [periodRaw, anchor, customRange]);

  // Para períodos fijos compara contra el anterior completo (febrero vs todo
  // enero); "Personalizado" compara contra un tramo del mismo largo.
  const prevRange = useMemo<DateRange>(() => comparisonRange(range, periodRaw), [range, periodRaw]);

  const rangeLabelStr = useMemo(() => formatRangeLabel(range, periodRaw), [range, periodRaw]);

  const navRange = useCallback(
    (delta: number) => {
      setSim((s) => (s === "empty" || s === "error" ? "normal" : s));
      if (periodRaw === "Personalizado") {
        const next = shiftRange(customRange ?? range, "Personalizado", delta);
        setCustomRange(next);
        persist("um.rangeStart", toISO(next.start));
        persist("um.rangeEnd", toISO(next.end));
      } else {
        const next = shiftRange(range, periodRaw, delta);
        setAnchor(next.start);
      }
    },
    [periodRaw, range, customRange]
  );

  const setRangeFn = useCallback((start: Date, end: Date) => {
    setSim((s) => (s === "empty" || s === "error" ? "normal" : s));
    const [s0, e0] = start.getTime() <= end.getTime() ? [start, end] : [end, start];
    const next: DateRange = { start: startOfDay(s0), end: endOfDay(e0) };
    setCustomRange(next);
    setPeriodRaw("Personalizado");
    persist("um.period", "Personalizado");
    persist("um.rangeStart", toISO(next.start));
    persist("um.rangeEnd", toISO(next.end));
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
  const openEdit = useCallback((tx: UITx) => {
    // tx optimista aún sin id real de Notion: no se puede editar/borrar todavía
    if (tx.id.startsWith("tmp-")) return;
    setEntry({ open: true, kind: tx.type, date: tx.date, edit: tx });
  }, []);

  // toast de errores (se auto-limpia)
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);
  const closeEntry = useCallback(() => setEntry((e) => ({ ...e, open: false })), []);

  const transactions = useMemo(() => txByYear[year] || [], [txByYear, year]);

  // fetch a year if not cached (dedup de requests en vuelo)
  const inFlightYears = useRef<Set<number>>(new Set());
  const ensureYear = useCallback(
    async (y: number) => {
      if (txByYear[y] || inFlightYears.current.has(y)) return;
      inFlightYears.current.add(y);
      setLoading(true);
      try {
        const res = await fetch(`/api/transactions?year=${y}`);
        if (!res.ok) throw new Error(`GET /api/transactions?year=${y} → ${res.status}`);
        const data = await res.json();
        const list: Transaction[] = data.transactions || [];
        setTxByYear((prev) => ({ ...prev, [y]: list.map((t) => txToUI(t, byId)) }));
      } catch (err) {
        console.error(err);
        setSim("error");
      } finally {
        inFlightYears.current.delete(y);
        setLoading(false);
      }
    },
    [txByYear, byId]
  );

  const navMonth = useCallback(
    (delta: number) => {
      setSim((s) => (s === "empty" || s === "error" ? "normal" : s));
      const next = addMonthsClamped(anchor, delta);
      setAnchor(next);
      if (!txByYear[next.getFullYear()]) void ensureYear(next.getFullYear());
    },
    [anchor, txByYear, ensureYear]
  );

  // asegura en cache todos los años que tocan el rango visible y el de
  // comparación — cubre pills fijas, navRange y el selector de rango custom.
  useEffect(() => {
    const years = new Set<number>([...yearsIn(range), ...yearsIn(prevRange)]);
    years.forEach((y) => {
      if (!txByYear[y]) void ensureYear(y);
    });
  }, [range, prevRange, txByYear, ensureYear]);

  // presupuestos del mes que muestra el Calendario/anchor (son mensuales por
  // definición del schema de Notion — no siguen al rango del Resumen).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/budgets?year=${year}&month=${month + 1}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`GET /api/budgets → ${res.status}`))))
      .then((data: { budgets: Budget[] }) => {
        if (!cancelled) setBudgets(data.budgets.map(budgetToUI));
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const setBudget = useCallback<StoreValue["setBudget"]>(
    async (categoryId, limit) => {
      const existing = budgets.find((b) => b.categoryId === categoryId);
      if (existing) {
        const res = await fetch(`/api/budgets/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit }),
        });
        if (!res.ok) throw new Error("update budget failed");
        const updated: Budget = await res.json();
        setBudgets((list) => list.map((b) => (b.id === existing.id ? budgetToUI(updated) : b)));
      } else {
        const catName = byId[categoryId]?.name ?? "Presupuesto";
        const res = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: catName,
            limit,
            currency,
            month: toISO(startOfMonth(anchor)),
            categoryId,
          }),
        });
        if (!res.ok) throw new Error("create budget failed");
        const created: Budget = await res.json();
        setBudgets((list) => [...list, budgetToUI(created)]);
      }
    },
    [budgets, byId, currency, anchor]
  );

  const visibleTx = useMemo(() => {
    if (sim === "empty" || sim === "error" || sim === "loading") return [];
    return yearsIn(range)
      .flatMap((y) => txByYear[y] ?? [])
      .filter((t) => t.date >= range.start && t.date <= range.end);
  }, [txByYear, range, sim]);

  const prevVisibleTx = useMemo(() => {
    return yearsIn(prevRange)
      .flatMap((y) => txByYear[y] ?? [])
      .filter((t) => t.date >= prevRange.start && t.date <= prevRange.end);
  }, [txByYear, prevRange]);

  const prevTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    prevVisibleTx.forEach((x) => {
      if (x.type === "income") income += x.amount;
      else expense += x.amount;
    });
    return { income, expense, balance: income - expense };
  }, [prevVisibleTx]);

  const breakdown = useMemo<BreakdownItem[]>(() => {
    const totals: Record<string, number> = {};
    let grand = 0;
    visibleTx.forEach((x) => {
      if (!x.cat || !byId[x.cat] || byId[x.cat].type !== focus) return;
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
  }, [visibleTx, byId, focus]);

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

  const findTx = useCallback(
    (id: string): UITx | undefined => {
      for (const list of Object.values(txByYear)) {
        const found = list.find((t) => t.id === id);
        if (found) return found;
      }
      return undefined;
    },
    [txByYear]
  );

  // mutaciones optimistas: aplican el cambio local al instante y sincronizan
  // con Notion en background; si falla, revierten y muestran toast.
  const addTransaction = useCallback<StoreValue["addTransaction"]>(
    async ({ cat, amount, date, note }) => {
      const category = byId[cat];
      const kind = category?.type === "income" ? "Ingreso" : "Gasto";
      const tempId = "tmp-" + crypto.randomUUID();
      upsertTx(date.getFullYear(), {
        id: tempId,
        cat,
        amount,
        date,
        note,
        type: category?.type ?? "expense",
      });
      void fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: kind,
          amount,
          currency,
          date: toISO(date),
          categoryId: cat,
          notes: note || undefined,
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`POST /api/transactions → ${res.status}`);
          const created: Transaction = await res.json();
          removeTx(tempId);
          const ui = txToUI(created, byId);
          upsertTx(ui.date.getFullYear(), ui);
        })
        .catch((err) => {
          console.error(err);
          removeTx(tempId);
          showNotice("No se pudo guardar el movimiento");
        });
    },
    [byId, upsertTx, removeTx, currency, showNotice]
  );

  const updateTransaction = useCallback<StoreValue["updateTransaction"]>(
    async (id, patch) => {
      const prev = findTx(id);
      if (!prev) return;
      const optimistic: UITx = {
        ...prev,
        cat: patch.cat ?? prev.cat,
        amount: patch.amount ?? prev.amount,
        date: patch.date ?? prev.date,
        note: patch.note !== undefined ? patch.note : prev.note,
        type: patch.cat ? byId[patch.cat]?.type ?? prev.type : prev.type,
      };
      // remove from all years then re-insert (date may have changed years)
      removeTx(id);
      upsertTx(optimistic.date.getFullYear(), optimistic);

      const body: Record<string, unknown> = {};
      if (patch.amount != null) body.amount = patch.amount;
      if (patch.note !== undefined) body.notes = patch.note;
      if (patch.date) body.date = toISO(patch.date);
      if (patch.cat) {
        body.categoryId = patch.cat;
        body.type = byId[patch.cat]?.type === "income" ? "Ingreso" : "Gasto";
      }
      void fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`PATCH /api/transactions/${id} → ${res.status}`);
          const updated: Transaction = await res.json();
          removeTx(id);
          const ui = txToUI(updated, byId);
          upsertTx(ui.date.getFullYear(), ui);
        })
        .catch((err) => {
          console.error(err);
          removeTx(id);
          upsertTx(prev.date.getFullYear(), prev);
          showNotice("No se pudieron guardar los cambios");
        });
    },
    [byId, findTx, removeTx, upsertTx, showNotice]
  );

  const deleteTransaction = useCallback<StoreValue["deleteTransaction"]>(
    async (id) => {
      const prev = findTx(id);
      removeTx(id);
      void fetch(`/api/transactions/${id}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok) throw new Error(`DELETE /api/transactions/${id} → ${res.status}`);
        })
        .catch((err) => {
          console.error(err);
          if (prev) upsertTx(prev.date.getFullYear(), prev);
          showNotice("No se pudo eliminar el movimiento");
        });
    },
    [findTx, removeTx, upsertTx, showNotice]
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

  // ---- subscriptions (recurrentes) mutations ----
  const addSubscription = useCallback<StoreValue["addSubscription"]>(
    async (input) => {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          type: input.type === "income" ? "Ingreso" : "Gasto",
          amount: input.amount,
          currency: input.currency,
          frequency: input.frequency,
          customIntervalDays: input.customIntervalDays,
          dueDay: input.dueDay,
          startDate: input.startDate,
          nextChargeDate: input.nextChargeDate,
          alertDaysBefore: input.alertDaysBefore,
          autoCreate: input.autoCreate,
          categoryId: input.cat ?? undefined,
          notes: input.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("create subscription failed");
      const created: Subscription = await res.json();
      setSubscriptions((list) => [...list, subToUI(created)]);
    },
    []
  );

  const updateSubscriptionFn = useCallback<StoreValue["updateSubscription"]>(
    async (id, patch) => {
      const body: Record<string, unknown> = {};
      if (patch.name != null) body.name = patch.name;
      if (patch.type) body.type = patch.type === "income" ? "Ingreso" : "Gasto";
      if (patch.amount != null) body.amount = patch.amount;
      if (patch.currency) body.currency = patch.currency;
      if (patch.frequency) body.frequency = patch.frequency;
      if (patch.customIntervalDays != null) body.customIntervalDays = patch.customIntervalDays;
      if (patch.dueDay != null) body.dueDay = patch.dueDay;
      if (patch.startDate) body.startDate = patch.startDate;
      if (patch.nextChargeDate) body.nextChargeDate = patch.nextChargeDate;
      if (patch.alertDaysBefore != null) body.alertDaysBefore = patch.alertDaysBefore;
      if (patch.autoCreate != null) body.autoCreate = patch.autoCreate;
      if (patch.status) body.status = patch.status;
      if (patch.cat !== undefined) body.categoryId = patch.cat ?? undefined;
      if (patch.notes !== undefined) body.notes = patch.notes;
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("update subscription failed");
      const updated: Subscription = await res.json();
      setSubscriptions((list) => list.map((s) => (s.id === id ? subToUI(updated) : s)));
    },
    []
  );

  const deleteSubscriptionFn = useCallback<StoreValue["deleteSubscription"]>(
    async (id) => {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete subscription failed");
      setSubscriptions((list) => list.filter((s) => s.id !== id));
    },
    []
  );

  // pays now (or on a given date/amount): creates the transaction server-side
  // and folds both the updated subscription and the new tx into local state,
  // so Movimientos/Resumen reflect it without a refetch.
  const paySubscription = useCallback<StoreValue["paySubscription"]>(
    async (id, opts) => {
      const res = await fetch(`/api/subscriptions/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts ?? {}),
      });
      if (!res.ok) throw new Error("pay subscription failed");
      const { subscription, transaction }: { subscription: Subscription; transaction: Transaction } = await res.json();
      setSubscriptions((list) => list.map((s) => (s.id === id ? subToUI(subscription) : s)));
      const ui = txToUI(transaction, byId);
      upsertTx(ui.date.getFullYear(), ui);
    },
    [byId, upsertTx]
  );

  const value: StoreValue = {
    categories,
    byId,
    transactions,
    visibleTx,
    breakdown,
    totals,
    period: periodRaw,
    setPeriod,
    range,
    prevRange,
    rangeLabel: rangeLabelStr,
    navRange,
    setRange: setRangeFn,
    prevTotals,
    month,
    year,
    navMonth,
    theme,
    setTheme,
    dashStyle,
    setDashStyle,
    accent,
    setAccent,
    currency,
    setCurrency,
    focus,
    setFocus,
    txFilter,
    setTxFilter,
    sim,
    setSim,
    loading,
    loadError,
    notice,
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
    subscriptions,
    addSubscription,
    updateSubscription: updateSubscriptionFn,
    deleteSubscription: deleteSubscriptionFn,
    paySubscription,
    budgets,
    setBudget,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { toISO, parseDate };
export type { Period, DateRange };
