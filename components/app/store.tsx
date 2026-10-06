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
import { addInterval } from "@/lib/recurrence";
import { fmt } from "@/lib/format";
import { closingCutoff, carryFor, openingBalance, type CarryResult } from "@/lib/balance";

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
  // Fijo (Subscription) al que corresponde este movimiento, si lo registró el
  // botón "Registrar pago". Alimenta "Pagos registrados" en el editor del fijo.
  sub: string | null;
  // Transferencia entre cuentas: no es ingreso ni gasto, no entra en totales ni saldo.
  transfer: boolean;
  // Moneda del movimiento. La app no convierte: el saldo suma todo sin conversión.
  currency: string;
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

// "system" sigue la apariencia del dispositivo (matchMedia); el tema resuelto
// ("light" | "dark") se escribe en <html data-theme>.
export type Theme = "system" | "light" | "dark";
export interface Notice {
  kind: "error" | "success";
  text: string;
}
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
  // Si viene seteado, el modal está confirmando este fijo (ver
  // modal-new-entry.tsx): precarga monto/categoría/nota y pide la fecha.
  sub: UISub | null;
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
  notice: Notice | null;
  dismissNotice: () => void;
  screen: Screen;
  setScreen: (s: Screen) => void;
  entry: EntryState;
  openEntry: (kind?: TxType, date?: Date | null) => void;
  openEdit: (tx: UITx) => void;
  openConfirmSub: (sub: UISub) => void;
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
  // pagos registrados de un fijo (movimientos enlazados por `sub`), del más
  // nuevo al más viejo; solo cubre los años ya cargados en cache.
  subPayments: (subId: string) => UITx[];
  confirmSubscription: (
    sub: UISub,
    input: { date: Date; amount: number; cat: string | null; note: string }
  ) => Promise<void>;
  budgets: UIBudget[];
  setBudget: (categoryId: string, limit: number) => Promise<void>;
  // ---- saldo acumulado ("dinero en mi poder") ----
  initialYear: number;
  // true = cada período arranca con lo que quedó del anterior; false = solo el período.
  carryOver: boolean;
  setCarryOver: (v: boolean) => void;
  carry: CarryState;
  retryHistory: () => void;
  // saldo inicial (Notion · Accounts.InitialBalance); null mientras carga
  initialBalance: number | null;
  setInitialBalance: (n: number) => Promise<void>;
  // todos los movimientos cargados (años en caché + historial), con optimistas
  allTx: UITx[];
  // saldo justo antes de `date` (exclusivo); null si todavía no se puede calcular
  balanceBefore: (date: Date) => number | null;
  // el rango visible depende de años que aún no se trajeron
  rangePending: boolean;
}

export type CarryState =
  | { status: "off" }
  | { status: "loading" }
  | { status: "error" }
  | ({ status: "ready" } & CarryResult);

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
  cat: string | null;
  notes?: string;
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
    sub: t.subscriptionId,
    transfer: t.type === "Transferencia",
    currency: t.currency ?? "ARS",
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

// crypto.randomUUID solo existe en contextos seguros (https/localhost): sobre
// http://<ip-lan> tira TypeError antes de guardar. Fallback para no depender de eso.
function newTempId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Respuesta no-2xx de la API. `detail` es el motivo que devolvió el servidor
// (`message` / `code` de Notion o `error`); `expired` = la sesión venció.
class HttpError extends Error {
  status: number;
  detail: string | null;
  expired: boolean;
  constructor(status: number, detail: string | null, expired: boolean) {
    super(`HTTP ${status}${detail ? ` · ${detail}` : ""}`);
    this.status = status;
    this.detail = detail;
    this.expired = expired;
  }
}

function httpErrorFrom(res: Response, body: unknown): HttpError {
  const b = (body && typeof body === "object" ? body : {}) as { error?: unknown; code?: unknown; message?: unknown };
  const pick = (v: unknown) => (typeof v === "string" && v ? v : null);
  const detail = pick(b.message) ?? pick(b.code) ?? pick(b.error);
  const expired = res.redirected || (res.status === 401 && b.error === "Sesión vencida");
  return new HttpError(res.status, detail, expired);
}

async function httpError(res: Response): Promise<HttpError> {
  return httpErrorFrom(res, await res.json().catch(() => null));
}

// Texto del toast: dice por qué falló en vez de un genérico.
function failureText(err: unknown, fallback: string): string {
  if (err instanceof HttpError) {
    if (err.expired) return "Tu sesión venció. Volvé a entrar.";
    if (err.status === 429) return err.detail ?? "Demasiadas operaciones. Esperá un minuto.";
    // Notion bloquea crear páginas cuando el workspace agotó los bloques del plan gratis
    if (err.detail && /free blocks/i.test(err.detail)) {
      return "Notion no deja crear más: el workspace llegó al límite de bloques del plan gratis. Hay que liberar espacio o mejorar el plan.";
    }
    return `${fallback} (${err.detail ?? "error " + err.status})`.slice(0, 140);
  }
  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) return `${fallback}: sin conexión`;
  return fallback;
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
  // Años cuyo contenido llegó completo (del servidor o de la API). Distinto de
  // "tiene entrada en txByYear": upsertTx puede crear un año con solo un movimiento
  // optimista, y ese año no está cargado.
  const [loadedYears, setLoadedYears] = useState<Set<number>>(() => new Set([initialYear]));
  // Historial anterior a initialYear (saldo arrastrado). Se pide UNA vez y solo con
  // el acumulado activo.
  const [history, setHistory] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [carryOver, setCarryOverRaw] = useState(true);
  const [initialBalance, setInitialBalanceRaw] = useState<number | null>(null);
  const isLoaded = useCallback(
    (y: number) => loadedYears.has(y) || (history === "ready" && y < initialYear),
    [loadedYears, history, initialYear]
  );

  const now = new Date();
  const [periodRaw, setPeriodRaw] = useState<Period>("Mes");
  const [anchor, setAnchor] = useState<Date>(() =>
    initialYear === now.getFullYear() ? now : new Date(initialYear, 0, 1)
  );
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const month = anchor.getMonth();
  const year = anchor.getFullYear();
  const [loading, setLoading] = useState(false);

  const [theme, setThemeRaw] = useState<Theme>("system");
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
  const [prefsReady, setPrefsReady] = useState(false);

  // hydrate prefs from localStorage (external store) — client only, runs once.
  useEffect(() => {
    const t = (localStorage.getItem("um.theme") as Theme) || "system";
    const d = (localStorage.getItem("um.dash") as DashStyle) || "A";
    const a = (localStorage.getItem("um.accent") as Accent) || "verde";
    const c = (localStorage.getItem("um.currency") as AppCurrency) || "EUR";
    const f = (localStorage.getItem("um.focus") as TxType) || "expense";
    setCarryOverRaw(localStorage.getItem("um.carry") !== "0");
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
    setPrefsReady(true);
  }, []);

  // Escribe tema resuelto y acento en <html> (el script de app/layout.tsx ya lo
  // hizo antes del primer paint; esto lo mantiene al cambiar). "system" escucha
  // los cambios de apariencia del dispositivo. Espera a hidratar las prefs para
  // no pisar el valor guardado con el default.
  useEffect(() => {
    if (!prefsReady) return;
    const root = document.documentElement;
    root.dataset.accent = accent;
    if (theme !== "system") {
      root.dataset.theme = theme;
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.theme = mq.matches ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [prefsReady, theme, accent]);

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
  const setCarryOver = useCallback((v: boolean) => {
    setCarryOverRaw(v);
    persist("um.carry", v ? "1" : "0");
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
    sub: null,
  });
  const openEntry = useCallback(
    (kind?: TxType, date?: Date | null) =>
      setEntry({ open: true, kind: kind || "expense", date: date || null, edit: null, sub: null }),
    []
  );
  const openEdit = useCallback((tx: UITx) => {
    // tx optimista aún sin id real de Notion: no se puede editar/borrar todavía
    if (tx.id.startsWith("tmp-")) return;
    setEntry({ open: true, kind: tx.type, date: tx.date, edit: tx, sub: null });
  }, []);
  const openConfirmSub = useCallback((sub: UISub) => {
    setEntry({ open: true, kind: sub.type, date: null, edit: null, sub });
  }, []);

  // avisos: los errores quedan hasta que se cierran (time-boxed UI es un
  // problema de accesibilidad); los éxitos se limpian solos a los 2.5 s.
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotice = useCallback((text: string, kind: Notice["kind"] = "error") => {
    setNotice({ kind, text });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (kind === "success") noticeTimer.current = setTimeout(() => setNotice(null), 2500);
  }, []);
  const dismissNotice = useCallback(() => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(null);
  }, []);
  // error de una mutación: muestra el motivo y, si la sesión venció, manda al login
  const notifyFailure = useCallback(
    (err: unknown, fallback: string) => {
      console.error(err);
      showNotice(failureText(err, fallback));
      if (err instanceof HttpError && err.expired) setTimeout(() => location.assign("/login"), 1800);
    },
    [showNotice]
  );
  const closeEntry = useCallback(() => setEntry((e) => ({ ...e, open: false })), []);

  const transactions = useMemo(() => txByYear[year] || [], [txByYear, year]);

  // fetch a year if not cached (dedup de requests en vuelo)
  const inFlightYears = useRef<Set<number>>(new Set());
  const ensureYear = useCallback(
    async (y: number) => {
      if (isLoaded(y) || inFlightYears.current.has(y)) return;
      inFlightYears.current.add(y);
      setLoading(true);
      try {
        const res = await fetch(`/api/transactions?year=${y}`);
        if (!res.ok) throw new Error(`GET /api/transactions?year=${y} → ${res.status}`);
        const data = await res.json();
        const list: Transaction[] = data.transactions || [];
        // los optimistas (tmp-) que se agregaron mientras el pedido estaba en
        // vuelo se conservan: si no, el fetch los pisa y el saldo da un salto
        setTxByYear((prev) => ({
          ...prev,
          [y]: [...(prev[y] ?? []).filter((t) => t.id.startsWith("tmp-")), ...list.map((t) => txToUI(t, byId))],
        }));
        setLoadedYears((prev) => new Set(prev).add(y));
      } catch (err) {
        console.error(err);
        setSim("error");
      } finally {
        inFlightYears.current.delete(y);
        setLoading(false);
      }
    },
    [isLoaded, byId]
  );

  const navMonth = useCallback(
    (delta: number) => {
      setSim((s) => (s === "empty" || s === "error" ? "normal" : s));
      const next = addMonthsClamped(anchor, delta);
      setAnchor(next);
      if (!isLoaded(next.getFullYear())) void ensureYear(next.getFullYear());
    },
    [anchor, isLoaded, ensureYear]
  );

  // asegura en cache todos los años que tocan el rango visible y el de
  // comparación — cubre pills fijas, navRange y el selector de rango custom.
  useEffect(() => {
    const years = new Set<number>([...yearsIn(range), ...yearsIn(prevRange)]);
    if (carryOver) {
      // el saldo necesita todos los años desde initialYear hasta el corte
      const last = closingCutoff(range, new Date()).until.getFullYear();
      for (let y = initialYear; y <= last; y++) years.add(y);
    }
    years.forEach((y) => {
      if (!isLoaded(y)) void ensureYear(y);
    });
  }, [range, prevRange, carryOver, initialYear, isLoaded, ensureYear]);

  // rango visible con años todavía sin traer: evita mostrar un "Sin movimientos" falso
  const rangePending = useMemo(() => yearsIn(range).some((y) => !isLoaded(y)), [range, isLoaded]);

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
      if (x.transfer) return;
      if (x.type === "income") income += x.amount;
      else expense += x.amount;
    });
    return { income, expense, balance: income - expense };
  }, [prevVisibleTx]);

  const breakdown = useMemo<BreakdownItem[]>(() => {
    const totals: Record<string, number> = {};
    let grand = 0;
    visibleTx.forEach((x) => {
      if (x.transfer || !x.cat || !byId[x.cat] || byId[x.cat].type !== focus) return;
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
      if (x.transfer) return;
      if (x.type === "income") income += x.amount;
      else expense += x.amount;
    });
    return { income, expense, balance: income - expense };
  }, [visibleTx]);

  // ---- saldo acumulado ----
  const allTx = useMemo(() => Object.values(txByYear).flat(), [txByYear]);

  const loadHistory = useCallback(async () => {
    setHistory("loading");
    try {
      const res = await fetch(`/api/transactions/history?before=${initialYear}-01-01`);
      if (!res.ok) throw await httpError(res);
      const data = await res.json();
      const list: Transaction[] = data.transactions ?? [];
      const byYear: Record<number, UITx[]> = {};
      for (const t of list) {
        const ui = txToUI(t, byId);
        (byYear[ui.date.getFullYear()] ||= []).push(ui);
      }
      setTxByYear((prev) => {
        const next = { ...prev };
        for (const [y, items] of Object.entries(byYear)) {
          next[Number(y)] = [...(prev[Number(y)] ?? []).filter((t) => t.id.startsWith("tmp-")), ...items];
        }
        return next;
      });
      setLoadedYears((prev) => {
        const next = new Set(prev);
        Object.keys(byYear).forEach((y) => next.add(Number(y)));
        return next;
      });
      setHistory("ready");
    } catch (err) {
      console.error(err);
      setHistory("error");
    }
  }, [initialYear, byId]);

  // una sola llamada, y solo con el acumulado activo
  useEffect(() => {
    if (prefsReady && carryOver && !initialLoadError && history === "idle") void loadHistory();
  }, [prefsReady, carryOver, initialLoadError, history, loadHistory]);

  const retryHistory = useCallback(() => setHistory("idle"), []);

  // saldo inicial: una vez al montar. Si Notion no tiene Accounts, queda en 0.
  useEffect(() => {
    if (!prefsReady || initialLoadError) return;
    let cancelled = false;
    fetch("/api/accounts/opening")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`GET /api/accounts/opening → ${res.status}`))))
      .then((d: { initialBalance?: number }) => {
        if (!cancelled) setInitialBalanceRaw(typeof d.initialBalance === "number" ? d.initialBalance : 0);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setInitialBalanceRaw(0);
      });
    return () => {
      cancelled = true;
    };
  }, [prefsReady, initialLoadError]);

  const setInitialBalance = useCallback<StoreValue["setInitialBalance"]>(async (n) => {
    const res = await fetch("/api/accounts/opening", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialBalance: n }),
    });
    if (!res.ok) throw await httpError(res);
    setInitialBalanceRaw(n);
  }, []);

  // Años completos desde initialYear hasta `lastYear` (y el historial anterior).
  const ledgerReady = useCallback(
    (lastYear: number) => {
      if (!carryOver || initialLoadError || history !== "ready" || initialBalance === null) return false;
      for (let y = initialYear; y <= lastYear; y++) if (!isLoaded(y)) return false;
      return true;
    },
    [carryOver, initialLoadError, history, initialBalance, initialYear, isLoaded]
  );

  const carry = useMemo<CarryState>(() => {
    if (!carryOver || sim !== "normal") return { status: "off" };
    if (initialLoadError || history === "error") return { status: "error" };
    const now = new Date();
    const last = closingCutoff(range, now).until.getFullYear();
    if (!ledgerReady(last)) return { status: "loading" };
    if (yearsIn(range).some((y) => !isLoaded(y))) return { status: "loading" };
    return { status: "ready", ...carryFor(allTx, range, now, initialBalance ?? 0) };
  }, [carryOver, sim, initialLoadError, history, range, ledgerReady, isLoaded, allTx, initialBalance]);

  const balanceBefore = useCallback(
    (date: Date): number | null => {
      if (!ledgerReady(new Date(date.getTime() - 1).getFullYear())) return null;
      return openingBalance(allTx, date, initialBalance ?? 0);
    },
    [ledgerReady, allTx, initialBalance]
  );

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
      const tempId = "tmp-" + newTempId();
      upsertTx(date.getFullYear(), {
        id: tempId,
        cat,
        amount,
        date,
        note,
        type: category?.type ?? "expense",
        sub: null,
        transfer: false,
        currency,
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
          if (!res.ok) throw await httpError(res);
          const created: Transaction = await res.json();
          removeTx(tempId);
          const ui = txToUI(created, byId);
          upsertTx(ui.date.getFullYear(), ui);
          showNotice(`${kind === "Ingreso" ? "Ingreso" : "Gasto"} agregado · ${fmt(amount, currency)}`, "success");
        })
        .catch((err) => {
          removeTx(tempId);
          notifyFailure(err, "No se pudo guardar el movimiento");
        });
    },
    [byId, upsertTx, removeTx, currency, notifyFailure, showNotice]
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
          if (!res.ok) throw await httpError(res);
          const updated: Transaction = await res.json();
          removeTx(id);
          const ui = txToUI(updated, byId);
          upsertTx(ui.date.getFullYear(), ui);
        })
        .catch((err) => {
          removeTx(id);
          upsertTx(prev.date.getFullYear(), prev);
          notifyFailure(err, "No se pudieron guardar los cambios");
        });
    },
    [byId, findTx, removeTx, upsertTx, notifyFailure]
  );

  const deleteTransaction = useCallback<StoreValue["deleteTransaction"]>(
    async (id) => {
      const prev = findTx(id);
      removeTx(id);
      void fetch(`/api/transactions/${id}`, { method: "DELETE" })
        .then(async (res) => {
          if (!res.ok) throw await httpError(res);
        })
        .catch((err) => {
          if (prev) upsertTx(prev.date.getFullYear(), prev);
          notifyFailure(err, "No se pudo eliminar el movimiento");
        });
    },
    [findTx, removeTx, upsertTx, notifyFailure]
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
          categoryId: input.cat ?? undefined,
          notes: input.notes || undefined,
        }),
      });
      if (!res.ok) throw await httpError(res);
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
      if (patch.status) body.status = patch.status;
      if (patch.cat !== undefined) body.categoryId = patch.cat ?? undefined;
      if (patch.notes !== undefined) body.notes = patch.notes;
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await httpError(res);
      const updated: Subscription = await res.json();
      setSubscriptions((list) => list.map((s) => (s.id === id ? subToUI(updated) : s)));
    },
    []
  );

  const deleteSubscriptionFn = useCallback<StoreValue["deleteSubscription"]>(
    async (id) => {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) throw await httpError(res);
      setSubscriptions((list) => list.filter((s) => s.id !== id));
    },
    []
  );

  const subPayments = useCallback<StoreValue["subPayments"]>(
    (subId) =>
      Object.values(txByYear)
        .flat()
        .filter((t) => t.sub === subId && !t.id.startsWith("tmp-"))
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [txByYear]
  );

  // registra el pago de un fijo con la fecha que eligió el usuario (default
  // hoy): aplica el cambio local al instante (transacción + avance de
  // NextChargeDate) y sincroniza con Notion en background; si falla o el fijo
  // ya se había registrado (409, ver app/api/subscriptions/[id]/pay), revierte
  // y avisa con el motivo del servidor.
  const confirmSubscription = useCallback<StoreValue["confirmSubscription"]>(
    async (sub, input) => {
      const prev = subscriptions.find((s) => s.id === sub.id) ?? sub;
      const dateISO = toISO(input.date);
      const covered = (prev.nextChargeDate ?? dateISO).slice(0, 10);
      const optimisticSub: UISub = {
        ...prev,
        lastChargedDate: dateISO,
        nextChargeDate: addInterval(covered, prev.frequency, prev.customIntervalDays, prev.dueDay),
      };
      const tempId = "tmp-" + newTempId();
      upsertTx(input.date.getFullYear(), {
        id: tempId,
        cat: input.cat,
        amount: input.amount,
        date: input.date,
        note: input.note,
        type: prev.type,
        sub: prev.id,
        transfer: false,
        currency: prev.currency,
      });
      setSubscriptions((list) => list.map((s) => (s.id === prev.id ? optimisticSub : s)));

      try {
        const res = await fetch(`/api/subscriptions/${prev.id}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: dateISO,
            expectedNext: prev.nextChargeDate?.slice(0, 10) ?? null,
            amount: input.amount,
            categoryId: input.cat ?? undefined,
            notes: input.note || undefined,
          }),
        });
        const body = await res.json().catch(() => null);
        if (res.status === 409) {
          removeTx(tempId);
          const restored: UISub | null = body?.subscription ? subToUI(body.subscription) : prev;
          setSubscriptions((list) => list.map((s) => (s.id === prev.id ? restored : s)));
          showNotice(typeof body?.error === "string" ? body.error : "Este fijo ya estaba registrado");
          return;
        }
        if (!res.ok || !body) throw httpErrorFrom(res, body);
        const { subscription, transaction }: { subscription: Subscription; transaction: Transaction } = body;
        removeTx(tempId);
        setSubscriptions((list) => list.map((s) => (s.id === prev.id ? subToUI(subscription) : s)));
        const ui = txToUI(transaction, byId);
        upsertTx(ui.date.getFullYear(), ui);
        showNotice(`Pago registrado · ${prev.name}`, "success");
      } catch (err) {
        removeTx(tempId);
        setSubscriptions((list) => list.map((s) => (s.id === prev.id ? prev : s)));
        notifyFailure(err, "No se pudo registrar el pago");
      }
    },
    [subscriptions, byId, upsertTx, removeTx, showNotice, notifyFailure]
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
    dismissNotice,
    screen,
    setScreen,
    entry,
    openEntry,
    openEdit,
    openConfirmSub,
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
    subPayments,
    confirmSubscription,
    budgets,
    setBudget,
    initialYear,
    carryOver,
    setCarryOver,
    carry,
    retryHistory,
    initialBalance,
    setInitialBalance,
    allTx,
    balanceBefore,
    rangePending,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { toISO, parseDate, failureText };
export type { Period, DateRange };
