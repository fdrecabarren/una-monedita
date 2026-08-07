// Date-range engine for the Resumen screen (Día / Semana / Mes / Año / Personalizado).
// Pure functions, no React — local Date objects throughout (no UTC math except
// for day-count arithmetic, where UTC avoids DST off-by-one errors).

export type Period = "Día" | "Semana" | "Mes" | "Año" | "Personalizado";

export interface DateRange {
  start: Date; // 00:00:00.000 local
  end: Date; // 23:59:59.999 local, inclusive
}

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ---- ISO <-> Date (mismo criterio que antes vivía en store.tsx: mediodía local,
// para no cruzarse con cambios de horario ni con el borde de medianoche) ----
export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

export function parseDate(s: string | null): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split("T")[0].split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

// ---- day-boundary helpers ----
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - day);
  return x;
}

export function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function startOfYear(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), 0, 1));
}

export function endOfYear(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), 11, 31));
}

// Adds whole months preserving day-of-month, clamped when the target month is
// shorter (31 ene + 1 mes → 28/29 feb, no 3 mar). Usado por navMonth (Calendario).
export function addMonthsClamped(d: Date, months: number): Date {
  const targetIndex = d.getMonth() + months;
  const first = new Date(d.getFullYear(), targetIndex, 1, d.getHours(), d.getMinutes(), d.getSeconds());
  const daysInTarget = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const day = Math.min(d.getDate(), daysInTarget);
  return new Date(first.getFullYear(), first.getMonth(), day, d.getHours(), d.getMinutes(), d.getSeconds());
}

// Inclusive day count between two dates (UTC day numbers — evita el desfasaje
// de ±1 hora que introduce el horario de verano si se resta en ms directo).
function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

export function daysBetween(a: Date, b: Date): number {
  return dayNumber(b) - dayNumber(a) + 1;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ---- range for a fixed period, anchored at a given date ----
export function rangeFor(period: Exclude<Period, "Personalizado">, anchor: Date): DateRange {
  switch (period) {
    case "Día":
      return { start: startOfDay(anchor), end: endOfDay(anchor) };
    case "Semana": {
      const s = startOfWeek(anchor);
      return { start: s, end: endOfDay(addDays(s, 6)) };
    }
    case "Mes":
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case "Año":
      return { start: startOfYear(anchor), end: endOfYear(anchor) };
  }
}

// Moves a range by `delta` units of `period`. For "Personalizado" (o cualquier
// rango arbitrario) desplaza por el largo del propio rango, para que ‹ › naveguen
// tramos consecutivos del mismo tamaño.
export function shiftRange(range: DateRange, period: Period, delta: number): DateRange {
  switch (period) {
    case "Día":
      return { start: addDays(range.start, delta), end: addDays(range.end, delta) };
    case "Semana":
      return { start: addDays(range.start, delta * 7), end: addDays(range.end, delta * 7) };
    case "Mes": {
      const s = new Date(range.start.getFullYear(), range.start.getMonth() + delta, 1);
      return { start: startOfMonth(s), end: endOfMonth(s) };
    }
    case "Año": {
      const s = new Date(range.start.getFullYear() + delta, 0, 1);
      return { start: startOfYear(s), end: endOfYear(s) };
    }
    case "Personalizado": {
      const len = daysBetween(range.start, range.end);
      const shift = len * delta;
      return { start: addDays(range.start, shift), end: addDays(range.end, shift) };
    }
  }
}

// Mismo largo, tramo inmediatamente anterior — para la comparativa del Resumen.
export function previousRange(range: DateRange): DateRange {
  const len = daysBetween(range.start, range.end);
  return { start: addDays(range.start, -len), end: addDays(range.end, -len) };
}

function shortDate(d: Date, withYear = false): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` + (withYear ? ` ${d.getFullYear()}` : "");
}

export function rangeLabel(range: DateRange, period: Period): string {
  const now = new Date();
  switch (period) {
    case "Día": {
      if (sameDay(range.start, now)) return "Hoy";
      if (sameDay(range.start, addDays(now, -1))) return "Ayer";
      if (sameDay(range.start, addDays(now, 1))) return "Mañana";
      return shortDate(range.start, range.start.getFullYear() !== now.getFullYear());
    }
    case "Semana": {
      const showYear = range.start.getFullYear() !== now.getFullYear() || range.end.getFullYear() !== now.getFullYear();
      return `${shortDate(range.start)} – ${shortDate(range.end, showYear)}`;
    }
    case "Mes":
      return `${MONTHS_FULL[range.start.getMonth()]} ${range.start.getFullYear()}`;
    case "Año":
      return String(range.start.getFullYear());
    case "Personalizado": {
      const crossYear = range.start.getFullYear() !== range.end.getFullYear();
      const showYear = crossYear || range.start.getFullYear() !== now.getFullYear();
      return `${shortDate(range.start, crossYear)} – ${shortDate(range.end, showYear)}`;
    }
  }
}

// Todos los años que el rango toca — para saber qué años pedir a la API
// (que sigue paginando por año).
export function yearsIn(range: DateRange): number[] {
  const out: number[] = [];
  for (let y = range.start.getFullYear(); y <= range.end.getFullYear(); y++) out.push(y);
  return out;
}

export interface Bucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

// Agrupa el rango en baldes para el mini-gráfico de tendencia: por día si el
// rango es corto, por semana si es mediano, por mes si es largo.
export function bucketsFor(range: DateRange): Bucket[] {
  const len = daysBetween(range.start, range.end);
  const out: Bucket[] = [];

  if (len <= 31) {
    let cur = startOfDay(range.start);
    while (cur <= range.end) {
      out.push({ key: toISO(cur), label: String(cur.getDate()), start: startOfDay(cur), end: endOfDay(cur) });
      cur = addDays(cur, 1);
    }
  } else if (len <= 186) {
    let cur = startOfWeek(range.start);
    while (cur <= range.end) {
      const wEnd = endOfDay(addDays(cur, 6));
      out.push({
        key: toISO(cur),
        label: shortDate(cur),
        start: cur < range.start ? range.start : cur,
        end: wEnd > range.end ? range.end : wEnd,
      });
      cur = addDays(cur, 7);
    }
  } else {
    let cur = startOfMonth(range.start);
    while (cur <= range.end) {
      const mEnd = endOfMonth(cur);
      out.push({
        key: `${cur.getFullYear()}-${cur.getMonth()}`,
        label: MONTHS_SHORT[cur.getMonth()],
        start: cur < range.start ? range.start : cur,
        end: mEnd > range.end ? range.end : mEnd,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }
  return out;
}
