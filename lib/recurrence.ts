// Recurrence engine for gastos/ingresos fijos (Subscriptions DB).
// Dates are local YYYY-MM-DD strings throughout — consistent with
// toISO()/parseDate() in components/app/store.tsx. No UTC Date math.

import type { Frequency } from "./notion/schemas";

// Months to add per frequency. Diaria/Semanal/Personalizada handled separately (days, not months).
const MONTHS_BY_FREQ: Partial<Record<Frequency, number>> = {
  Mensual: 1,
  Bimestral: 2,
  Trimestral: 3,
  Semestral: 6,
  Anual: 12,
};

interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

function parseYMD(iso: string): YMD {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return { y, m, d };
}

function toISODate(y: number, m: number, d: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(m)}-${p(d)}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate(); // m is 1-12; Date(y, m, 0) = last day of month m
}

// Clamp a target day-of-month to a valid day for that y/m (e.g. 31 in Feb → 28/29).
export function clampDay(y: number, m: number, day: number): number {
  return Math.min(Math.max(day, 1), daysInMonth(y, m));
}

// Same year/month as `iso`, day replaced by `dueDay` (clamped to month length).
// Used when the user edits DueDay: 2026-09-10 + day 26 -> 2026-09-26.
export function withDueDay(iso: string, dueDay: number): string {
  const { y, m } = parseYMD(iso);
  return toISODate(y, m, clampDay(y, m, dueDay));
}

function addDays(iso: string, days: number): string {
  const { y, m, d } = parseYMD(iso);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function addMonths(iso: string, months: number, dueDay?: number | null): string {
  const { y, m, d } = parseYMD(iso);
  const targetDay = dueDay ?? d;
  const total = (m - 1) + months;
  const ny = y + Math.floor(total / 12);
  // módulo positivo: con meses negativos `%` da resto negativo (retroceder desde enero)
  const nm = (((total % 12) + 12) % 12) + 1;
  return toISODate(ny, nm, clampDay(ny, nm, targetDay));
}

// Advance a date by one period of the given frequency.
export function addInterval(
  iso: string,
  freq: Frequency | null,
  customIntervalDays?: number | null,
  dueDay?: number | null
): string {
  if (freq === "Diaria") return addDays(iso, 1);
  if (freq === "Semanal") return addDays(iso, 7);
  if (freq === "Personalizada") return addDays(iso, customIntervalDays && customIntervalDays > 0 ? customIntervalDays : 30);
  const months = (freq && MONTHS_BY_FREQ[freq]) || 1;
  return addMonths(iso, months, dueDay);
}

// Retrocede una fecha un período de la frecuencia dada (inverso de addInterval).
export function subtractInterval(
  iso: string,
  freq: Frequency | null,
  customIntervalDays?: number | null,
  dueDay?: number | null
): string {
  if (freq === "Diaria") return addDays(iso, -1);
  if (freq === "Semanal") return addDays(iso, -7);
  if (freq === "Personalizada") return addDays(iso, -(customIntervalDays && customIntervalDays > 0 ? customIntervalDays : 30));
  const months = (freq && MONTHS_BY_FREQ[freq]) || 1;
  return addMonths(iso, -months, dueDay);
}

interface RecurrenceLike {
  frequency: Frequency | null;
  customIntervalDays?: number | null;
  dueDay?: number | null;
}

// First NextChargeDate for a brand-new subscription: picks the closest valid
// occurrence on/after startDate — e.g. startDate 2026-07-01 with dueDay 14 on
// a Mensual freq → first charge 2026-07-14, not 2026-08-14. Diaria/Semanal/
// Personalizada have no day-of-month concept, so the first charge is
// startDate itself.
export function firstChargeDate(
  startDate: string,
  freq: Frequency | null,
  customIntervalDays?: number | null,
  dueDay?: number | null
): string {
  if (!MONTHS_BY_FREQ[freq as Frequency] || !dueDay) return startDate;
  const { y, m } = parseYMD(startDate);
  const candidate = toISODate(y, m, clampDay(y, m, dueDay));
  if (candidate >= startDate) return candidate;
  return addInterval(startDate, freq, customIntervalDays, dueDay);
}

// Normalize any frequency's amount to a monthly-equivalent, for the
// estimated-total header in the recurrentes screen.
export function monthlyEquivalent(amount: number, sub: RecurrenceLike): number {
  switch (sub.frequency) {
    case "Diaria":
      return amount * 30.4375;
    case "Semanal":
      return (amount * 52) / 12;
    case "Mensual":
      return amount;
    case "Bimestral":
      return amount / 2;
    case "Trimestral":
      return amount / 3;
    case "Semestral":
      return amount / 6;
    case "Anual":
      return amount / 12;
    case "Personalizada": {
      const days = sub.customIntervalDays && sub.customIntervalDays > 0 ? sub.customIntervalDays : 30;
      return (amount * 30.4375) / days;
    }
    default:
      return amount;
  }
}

export function todayISO(): string {
  const now = new Date();
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// Primer y último día del mes de `today` (ISO local).
export function monthBounds(today: string): { start: string; end: string } {
  const { y, m } = parseYMD(today);
  return { start: toISODate(y, m, 1), end: toISODate(y, m, daysInMonth(y, m)) };
}

// Estado de un fijo en el MES de `today` (el contador "N/M pagados" arranca de
// cero cada mes porque se calcula contra el mes calendario, no contra "hay pago"):
//   paused  pausado (no cuenta)
//   late    le tocaba antes de hoy y sigue sin pagarse
//   today   vence hoy
//   pending vence más adelante este mes
//   paid    el período de este mes ya se registró
//   later   no le toca este mes (anual, bimestral, recién creado con vencimiento futuro)
//   none    sin fechas
// Limitación aceptada: Diaria/Semanal/Personalizada corta muestran "pending" casi
// todo el mes porque Notion guarda un solo próximo vencimiento, no uno por período.
export type SubMonthKind = "paused" | "late" | "today" | "pending" | "paid" | "later" | "none";

export interface SubMonthStatus {
  kind: SubMonthKind;
  // vencimiento (late/today/pending/later) o fecha del último pago (paid)
  date: string | null;
}

export interface SubLike extends RecurrenceLike {
  status: "Activa" | "Pausada" | "Cancelada" | null;
  nextChargeDate: string | null;
  lastChargedDate: string | null;
}

export function monthStatus(sub: SubLike, today: string): SubMonthStatus {
  if (sub.status === "Pausada") return { kind: "paused", date: null };
  const { start: mStart, end: mEnd } = monthBounds(today);
  const next = sub.nextChargeDate?.slice(0, 10) ?? null;
  const last = sub.lastChargedDate?.slice(0, 10) ?? null;

  if (!next) {
    return last && last >= mStart ? { kind: "paid", date: last } : { kind: "none", date: null };
  }
  if (next <= mEnd) {
    return { kind: next < today ? "late" : next === today ? "today" : "pending", date: next };
  }
  // El próximo vencimiento cae después de este mes. Si el período de este mes ya
  // se pagó, `next` ya avanzó: retrocedemos desde `next` para ver si este mes le tocaba.
  let d = next;
  for (let i = 0; i < 1000 && d > mEnd; i++) {
    d = subtractInterval(d, sub.frequency, sub.customIntervalDays, sub.dueDay);
  }
  const occursInMonth = d >= mStart;
  if (last && (occursInMonth || last >= mStart)) return { kind: "paid", date: last };
  return { kind: "later", date: next };
}

// Contador del encabezado de Fijos: solo activos; `due` = los que cuentan este mes.
export function monthCounter(subs: SubLike[], today: string): { paid: number; due: number } {
  let paid = 0;
  let due = 0;
  for (const s of subs) {
    if (s.status !== "Activa") continue;
    const k = monthStatus(s, today).kind;
    if (k === "paid") {
      paid++;
      due++;
    } else if (k === "late" || k === "today" || k === "pending") due++;
  }
  return { paid, due };
}
