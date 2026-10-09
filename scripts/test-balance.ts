// Tests del saldo acumulado (lib/balance.ts). Sin dependencias: se corre con
//   npx tsx scripts/test-balance.ts
// Todas las fechas se construyen con el constructor local, así que el archivo
// pasa en cualquier zona horaria.

import { netBetween, openingBalance, closingCutoff, carryFor, balanceSeries, availableFor, initialForAvailable, type BalTx } from "../lib/balance";
import { parseAmount, fmt, fitFontSize } from "../lib/format";
import { rangeFor, bucketsFor, balanceLabel, startOfDay, endOfDay, toISO, type DateRange } from "../lib/date-range";

let passed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? ": " + detail : ""}`);
}

function eq<T>(name: string, actual: T, expected: T) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(name, a === e, `esperaba ${e}, obtuvo ${a}`);
}

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h);
const inc = (date: Date, amount: number): BalTx => ({ date, amount, type: "income" });
const exp = (date: Date, amount: number): BalTx => ({ date, amount, type: "expense" });
const str = (r: DateRange) => `${toISO(r.start)}..${toISO(r.end)}`;

// ---- historial vacío ----
{
  const now = d(2026, 10, 6);
  const r = rangeFor("Mes", now);
  const c = carryFor([], r, now, 0);
  eq("vacío: opening 0", c.opening, 0);
  eq("vacío: closing 0", c.closing, 0);
  eq("vacío: kind hoy", c.kind, "hoy");
  eq("vacío con saldo inicial", carryFor([], r, now, 5000).closing, 5000);
}

// ---- netBetween: inclusivo y transferencias ----
{
  const txs: BalTx[] = [
    inc(d(2026, 10, 1, 0), 100),
    exp(d(2026, 10, 31, 23), 30),
    { date: d(2026, 10, 5), amount: 999, type: "expense", transfer: true },
    inc(d(2026, 11, 1, 0), 1),
  ];
  const r = rangeFor("Mes", d(2026, 10, 15));
  eq("neto del mes (límites inclusivos, sin transferencia)", netBetween(txs, r.start, r.end), { income: 100, expense: 30, net: 70 });
  eq("opening excluye el inicio del rango", openingBalance(txs, r.start, 0), 0);
  eq("opening de noviembre", openingBalance(txs, rangeFor("Mes", d(2026, 11, 10)).start, 0), 70);
}

// ---- cruce diciembre → enero ----
{
  const txs = [inc(d(2025, 12, 31, 20), 200), exp(d(2026, 1, 1, 9), 50)];
  const enero = rangeFor("Mes", d(2026, 1, 15));
  const now = d(2026, 1, 20);
  const c = carryFor(txs, enero, now, 10);
  eq("dic→ene: opening arrastra diciembre", c.opening, 210);
  eq("dic→ene: net de enero", c.net, -50);
  eq("dic→ene: closing", c.closing, 160);
  const dic = rangeFor("Mes", d(2025, 12, 15));
  eq("dic: closing = opening de enero", carryFor(txs, dic, now, 10).closing, c.opening);
  eq("dic: kind cierre", carryFor(txs, dic, now, 10).kind, "cierre");
}

// ---- rango anterior al primer movimiento ----
{
  const txs = [inc(d(2026, 6, 10), 500)];
  const now = d(2026, 10, 6);
  const mar = rangeFor("Mes", d(2026, 3, 10));
  const c = carryFor(txs, mar, now, 1000);
  eq("antes del primer movimiento: opening = saldo inicial", c.opening, 1000);
  eq("antes del primer movimiento: closing = saldo inicial", c.closing, 1000);
}

// ---- rango futuro: previsto ----
{
  const txs = [inc(d(2026, 10, 1), 100), exp(d(2026, 12, 5), 40)];
  const now = d(2026, 10, 6);
  const dic = rangeFor("Mes", d(2026, 12, 15));
  const c = carryFor(txs, dic, now, 0);
  eq("futuro: kind previsto", c.kind, "previsto");
  eq("futuro: opening", c.opening, 100);
  eq("futuro: closing incluye lo previsto", c.closing, 60);
  eq("futuro: sin futureCount (todo el rango es futuro)", c.futureCount, 0);
}

// ---- movimiento futuro dentro del mes en curso ----
{
  const now = d(2026, 10, 6, 10);
  const txs = [inc(d(2026, 10, 1), 300), exp(d(2026, 10, 6, 18), 20), exp(d(2026, 10, 20), 100)];
  const oct = rangeFor("Mes", now);
  const c = carryFor(txs, oct, now, 0);
  eq("mes en curso: kind hoy", c.kind, "hoy");
  eq("mes en curso: cuenta lo de hoy aunque sea más tarde", c.expense, 20);
  eq("mes en curso: closing hasta hoy", c.closing, 280);
  eq("mes en curso: 1 movimiento futuro", c.futureCount, 1);
  eq("mes en curso: balance del período completo", netBetween(txs, oct.start, oct.end).net, 180);
}

// ---- Personalizado a mitad de mes ----
{
  const now = d(2026, 10, 30);
  const txs = [inc(d(2026, 10, 1), 100), exp(d(2026, 10, 9), 10), exp(d(2026, 10, 10), 20), inc(d(2026, 10, 20), 5)];
  const r: DateRange = { start: startOfDay(d(2026, 10, 10)), end: endOfDay(d(2026, 10, 19)) };
  const c = carryFor(txs, r, now, 0);
  eq("personalizado: opening", c.opening, 90);
  eq("personalizado: net", c.net, -20);
  eq("personalizado: closing", c.closing, 70);
  eq("personalizado: kind cierre", c.kind, "cierre");
}

// ---- invariante opening + net === closing, y serie ----
{
  const now = d(2026, 10, 6);
  const txs = [inc(d(2026, 9, 5), 1000), exp(d(2026, 9, 20), 250), inc(d(2026, 10, 1), 80), exp(d(2026, 10, 3), 30), exp(d(2026, 10, 3, 18), 5)];
  for (const period of ["Día", "Semana", "Mes", "Año"] as const) {
    const r = rangeFor(period, now);
    const c = carryFor(txs, r, now, 0);
    eq(`invariante ${period}`, c.opening + c.net, c.closing);
  }
  const oct = rangeFor("Mes", now);
  const opening = openingBalance(txs, oct.start, 0);
  const series = balanceSeries(txs, bucketsFor(oct), opening, now);
  eq("serie: un balde por día", series.length, 31);
  eq("serie: día 3 (dos gastos)", series[2].net, -35);
  eq("serie: cierra en opening + balance del mes", series[series.length - 1].closing, opening + netBetween(txs, oct.start, oct.end).net);
  check("serie: día 7 es futuro, día 6 no", series[6].future && !series[5].future);
  const semanal = balanceSeries(txs, bucketsFor(oct, "week"), opening, now);
  eq("serie semanal: cierra igual", semanal[semanal.length - 1].closing, series[series.length - 1].closing);
  check("serie semanal: 5 o 6 semanas", semanal.length >= 5 && semanal.length <= 6, String(semanal.length));
}

// ---- bucketsFor con unidad forzada ----
{
  const oct = rangeFor("Mes", d(2026, 10, 15));
  eq("buckets por defecto (mes) = días", bucketsFor(oct).length, 31);
  const w = bucketsFor(oct, "week");
  eq("primer balde semanal arranca el 1/10", toISO(w[0].start), "2026-10-01");
  eq("último balde semanal termina el 31/10", toISO(w[w.length - 1].end), "2026-10-31");
  const y = bucketsFor(rangeFor("Año", d(2026, 5, 1)));
  eq("año = 12 baldes mensuales", y.length, 12);
}

// ---- closingCutoff ----
{
  const now = d(2026, 10, 6);
  eq("cutoff mes en curso", closingCutoff(rangeFor("Mes", now), now).kind, "hoy");
  eq("cutoff mes pasado", str({ start: rangeFor("Mes", d(2026, 9, 1)).start, end: closingCutoff(rangeFor("Mes", d(2026, 9, 1)), now).until }), "2026-09-01..2026-09-30");
  eq("cutoff día de hoy", closingCutoff(rangeFor("Día", now), now).kind, "hoy");
  eq("cutoff mañana", closingCutoff(rangeFor("Día", d(2026, 10, 7)), now).kind, "previsto");
}

// ---- balanceLabel ----
{
  const now = d(2026, 10, 6);
  eq("label día hoy", balanceLabel("Día", rangeFor("Día", now), now), "Balance de hoy");
  eq("label día ayer", balanceLabel("Día", rangeFor("Día", d(2026, 10, 5)), now), "Balance diario");
  eq("label semana", balanceLabel("Semana", rangeFor("Semana", now), now), "Balance semanal");
  eq("label mes", balanceLabel("Mes", rangeFor("Mes", now), now), "Balance mensual");
  eq("label año", balanceLabel("Año", rangeFor("Año", now), now), "Balance anual");
  eq("label rango", balanceLabel("Personalizado", rangeFor("Mes", now), now), "Balance del período");
}

// ---- Disponible hoy (independiente del rango) ----
{
  // El ejemplo del usuario: 1000, gasta 100 → 900, cobra 400 → 1300, cambia el mes → 1300
  const sep = d(2026, 9, 20);
  const oct = d(2026, 10, 3);
  const nov = d(2026, 11, 2);
  eq("sin movimientos: 1000", availableFor([], sep, 1000).amount, 1000);
  const t1 = [exp(d(2026, 9, 21), 100)];
  eq("gasta 100 → 900", availableFor(t1, d(2026, 9, 22), 1000).amount, 900);
  const t2 = [...t1, inc(oct, 400)];
  eq("cobra 400 → 1300", availableFor(t2, oct, 1000).amount, 1300);
  eq("cambia el mes → sigue 1300", availableFor(t2, nov, 1000).amount, 1300);
  eq("monthNet del mes en curso", availableFor(t2, oct, 1000).monthNet, 400);
  eq("monthNet el mes siguiente es 0", availableFor(t2, nov, 1000).monthNet, 0);
  // movimiento de mañana: no cuenta todavía
  const fut = [...t2, exp(d(2026, 10, 4), 50)];
  const a = availableFor(fut, oct, 1000);
  eq("futuro excluido del monto", a.amount, 1300);
  eq("futuro se cuenta aparte", a.futureCount, 1);
  // el movimiento de hoy a última hora SÍ entra (fin de día)
  eq("hoy a las 23:59 entra", availableFor([exp(d(2026, 10, 3, 23), 10)], d(2026, 10, 3, 8), 100).amount, 90);
  // transferencias ignoradas
  const tr: BalTx = { date: oct, amount: 700, type: "expense", transfer: true };
  eq("transferencias ignoradas", availableFor([tr], oct, 500).amount, 500);
  eq("transferencias no cuentan como futuras", availableFor([{ ...tr, date: d(2026, 10, 9) }], oct, 0).futureCount, 0);
}

// ---- initialForAvailable (¿Cuánta plata tenés hoy?) ----
{
  const now = d(2026, 10, 9);
  // caso real: neto histórico 1022,52 y el usuario tiene 1000
  const txs = [inc(d(2026, 5, 3), 4620.55), exp(d(2026, 6, 1), 3598.03)];
  const init = initialForAvailable(txs, 1000, now);
  eq("inicial = 1000 − 1022,52", init, -22.52);
  eq("con ese inicial el disponible es EXACTO 1000", availableFor(txs, now, init).amount, 1000);
  // objetivo 0: nunca -0
  const zero = initialForAvailable([inc(d(2026, 5, 3), 50)], 50, now);
  check("objetivo = neto da 0 (no -0)", Object.is(zero, 0), String(zero));
  check("fmt de 0 no empieza con signo", !fmt(availableFor([inc(d(2026, 5, 3), 50)], now, zero).amount, "EUR").startsWith("−"));
  // un movimiento de mañana no entra en el cálculo del inicial
  eq("futuro no entra en el inicial", initialForAvailable([...txs, exp(d(2026, 10, 10), 999)], 1000, now), -22.52);
  // moneda con decimales flotantes
  eq("sin ruido de flotantes", availableFor([inc(d(2026, 5, 1), 0.1), inc(d(2026, 5, 2), 0.2)], now, 0).amount, 0.3);
}

// ---- fitFontSize ----
{
  eq("techo: texto corto usa el máximo", fitFontSize("€ 5", 200, 34), 34);
  eq("piso: texto larguísimo usa el mínimo", fitFontSize("€ 1.234.567.890,12", 60, 34, 12), 12);
  const t = fmt(1060.63, "EUR");
  const s = fitFontSize(t, 98, 34);
  check("€ 1.060,63 entra en 98px", s * t.length * 0.62 <= 98 + 1e-9, `size ${s}`);
  check("€ 1.060,63 en 98px no llega al máximo", s < 34);
  eq("ancho cero cae al piso", fitFontSize("€ 10", 0, 34, 11), 11);
}

// ---- parseAmount (campo "Saldo inicial") ----
{
  eq("parse 150000", parseAmount("150000"), 150000);
  eq("parse 150.000 (miles es-AR)", parseAmount("150.000"), 150000);
  eq("parse 1.234.567", parseAmount("1.234.567"), 1234567);
  eq("parse 1234.56 (decimal)", parseAmount("1234.56"), 1234.56);
  eq("parse 1.234,56", parseAmount("1.234,56"), 1234.56);
  eq("parse 1,234.56", parseAmount("1,234.56"), 1234.56);
  eq("parse 1234,5", parseAmount("1234,5"), 1234.5);
  eq("parse con símbolo y espacios", parseAmount(" $ 12 500 "), 12500);
  eq("parse negativo", parseAmount("-2000"), -2000);
  eq("parse negativo con signo menos tipográfico", parseAmount("−2000"), -2000);
  eq("parse vacío", parseAmount(""), null);
  eq("parse texto", parseAmount("abc"), null);
}

if (failures.length) {
  console.error(`✗ ${failures.length} fallaron (${passed} OK):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ ${passed} checks OK`);
