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
  const nm = (total % 12) + 1;
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

interface RecurrenceLike {
  frequency: Frequency | null;
  customIntervalDays?: number | null;
  dueDay?: number | null;
}

// Walk forward from `fromISO` until the next charge date is strictly after
// `afterISO` (defaults to today). Covers subscriptions overdue by several
// periods without generating one transaction per missed period.
export function nextChargeAfter(sub: RecurrenceLike, fromISO: string, afterISO?: string): string {
  const today = afterISO ?? toISODate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  let next = addInterval(fromISO, sub.frequency, sub.customIntervalDays, sub.dueDay);
  // Safety cap: never loop more than ~500 periods (covers a decade of "Diaria").
  let guard = 0;
  while (next <= today && guard < 500) {
    next = addInterval(next, sub.frequency, sub.customIntervalDays, sub.dueDay);
    guard++;
  }
  return next;
}

// First NextChargeDate for a brand-new subscription. Unlike nextChargeAfter()
// (which always jumps a full period forward from a reference date), this
// picks the closest valid occurrence on/after startDate — e.g. startDate
// 2026-07-01 with dueDay 14 on a Mensual freq → first charge 2026-07-14, not
// 2026-08-14. Diaria/Semanal/Personalizada have no day-of-month concept, so
// the first charge is startDate itself.
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
