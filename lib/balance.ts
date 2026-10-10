// Saldo acumulado ("dinero en mi poder"). Funciones puras, sin React, sobre una
// lista de movimientos con fecha local. Convenciones:
//   - Disponible hoy = saldo inicial + ingresos − gastos de todo lo fechado hasta
//     hoy. NO depende del rango que se esté mirando (availableFor).
//   - El saldo inicial se calcula desde "¿Cuánta plata tenés hoy?"
//     (initialForAvailable) y puede ser negativo.
//   - Balance del período = ingresos − gastos dentro del rango (inclusive).
//   - Saldo al inicio del período (opening) = saldo inicial + ingresos − gastos de
//     todo lo anterior al inicio del rango.
//   - Saldo del período (closing) = opening + balance del período contado hasta el
//     corte (hoy si el rango lo contiene; el fin del rango si ya pasó o aún no
//     empezó). Solo lo usa la hoja "Tu saldo".
//   - Las transferencias no son ingreso ni gasto: se ignoran.

import { endOfDay, startOfMonth, type Bucket, type DateRange } from "./date-range";

export interface BalTx {
  date: Date;
  amount: number;
  type: "income" | "expense";
  transfer?: boolean;
}

export interface Net {
  income: number;
  expense: number;
  net: number;
}

// Suma de ingresos y gastos con from <= fecha <= to (límites opcionales, inclusivos).
export function netBetween(txs: BalTx[], from?: Date, to?: Date): Net {
  let income = 0;
  let expense = 0;
  const f = from ? from.getTime() : -Infinity;
  const t = to ? to.getTime() : Infinity;
  for (const x of txs) {
    if (x.transfer) continue;
    const ms = x.date.getTime();
    if (ms < f || ms > t) continue;
    if (x.type === "income") income += x.amount;
    else expense += x.amount;
  }
  return { income, expense, net: income - expense };
}

// Saldo antes de `before` (exclusivo): saldo inicial + todo lo anterior.
export function openingBalance(txs: BalTx[], before: Date, initial = 0): number {
  const f = netBetween(txs, undefined, new Date(before.getTime() - 1));
  return initial + f.net;
}

export type CutoffKind = "hoy" | "cierre" | "previsto";

// Hasta dónde se cuenta el "Disponible" para un rango:
//   contiene hoy → fin de hoy ("hoy"); ya terminó → fin del rango ("cierre");
//   todavía no empezó → fin del rango ("previsto").
export function closingCutoff(range: DateRange, now: Date): { until: Date; kind: CutoffKind } {
  if (range.start.getTime() <= now.getTime() && now.getTime() <= range.end.getTime()) {
    return { until: endOfDay(now), kind: "hoy" };
  }
  if (range.end.getTime() < now.getTime()) return { until: range.end, kind: "cierre" };
  return { until: range.end, kind: "previsto" };
}

export interface CarryResult {
  opening: number;
  income: number;
  expense: number;
  net: number;
  closing: number;
  kind: CutoffKind;
  until: Date;
  // movimientos del rango con fecha posterior al corte (no se cuentan todavía)
  futureCount: number;
}

// Todo lo que muestra el Resumen en modo Acumulado, en una sola pasada lógica.
export function carryFor(txs: BalTx[], range: DateRange, now: Date, initial = 0): CarryResult {
  const { until, kind } = closingCutoff(range, now);
  const opening = openingBalance(txs, range.start, initial);
  const period = netBetween(txs, range.start, until);
  let futureCount = 0;
  if (until.getTime() < range.end.getTime()) {
    for (const x of txs) {
      if (x.transfer) continue;
      const ms = x.date.getTime();
      if (ms > until.getTime() && ms <= range.end.getTime()) futureCount++;
    }
  }
  return {
    opening,
    income: period.income,
    expense: period.expense,
    net: period.net,
    closing: opening + period.net,
    kind,
    until,
    futureCount,
  };
}

// `+ 0` normaliza -0 a 0 (evita "−0,00" en pantalla).
const round2 = (n: number) => Math.round(n * 100) / 100 + 0;

export interface Available {
  // saldo inicial + todo lo fechado hasta el fin de hoy
  amount: number;
  // ingresos − gastos del mes de `now`, hasta hoy (decide si la monedita "brota")
  monthNet: number;
  // movimientos con fecha posterior a hoy (todavía no cuentan)
  futureCount: number;
}

// "Disponible hoy": independiente del rango que se esté viendo.
export function availableFor(txs: BalTx[], now: Date, initial = 0): Available {
  const until = endOfDay(now);
  let futureCount = 0;
  for (const x of txs) {
    if (!x.transfer && x.date.getTime() > until.getTime()) futureCount++;
  }
  return {
    amount: round2(initial + netBetween(txs, undefined, until).net),
    monthNet: round2(netBetween(txs, startOfMonth(now), until).net),
    futureCount,
  };
}

// Saldo inicial que hace que el Disponible de hoy sea `target`. Puede ser negativo.
export function initialForAvailable(txs: BalTx[], target: number, now: Date): number {
  return round2(target - netBetween(txs, undefined, endOfDay(now)).net);
}

export interface SeriesPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  // saldo al cierre del balde (arrastrando el saldo anterior)
  closing: number;
  // el balde empieza después de hoy: es una previsión
  future: boolean;
}

// Balance por balde (día/semana/mes) con saldo acumulado. `opening` es el saldo
// previo al primer balde; el último `closing` coincide con opening + balance del rango.
export function balanceSeries(txs: BalTx[], buckets: Bucket[], opening: number, now: Date): SeriesPoint[] {
  let running = opening;
  return buckets.map((b) => {
    const n = netBetween(txs, b.start, b.end);
    running += n.net;
    return {
      key: b.key,
      label: b.label,
      income: n.income,
      expense: n.expense,
      net: n.net,
      closing: running,
      future: b.start.getTime() > endOfDay(now).getTime(),
    };
  });
}
