// Tests del motor de recurrencia (lib/recurrence.ts). Sin dependencias: se corre con
//   npx tsx scripts/test-recurrence.ts

import {
  addInterval,
  subtractInterval,
  withDueDay,
  firstChargeDate,
  clampDay,
  monthBounds,
  monthStatus,
  monthCounter,
  type SubLike,
} from "../lib/recurrence";

let passed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? " — " + detail : ""}`);
}

function eq<T>(name: string, actual: T, expected: T) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(name, a === e, `esperaba ${e}, obtuvo ${a}`);
}

// ─────────────────────────── addInterval ───────────────────────────
{
  eq("addInterval Mensual: día 10", addInterval("2026-10-10", "Mensual", null, 10), "2026-11-10");
  eq("addInterval Mensual: día 26 (caso Claude)", addInterval("2026-09-26", "Mensual", null, 26), "2026-10-26");

  // Clamp: no debe "pegarse" al día corto de un mes previo.
  eq("addInterval Mensual: 31 ene → 28 feb (clamp)", addInterval("2026-01-31", "Mensual", null, 31), "2026-02-28");
  eq(
    "addInterval Mensual: desde 28 feb con dueDay 31 → 31 mar (no se pega al 28)",
    addInterval("2026-02-28", "Mensual", null, 31),
    "2026-03-31"
  );

  // Bisiesto.
  eq("addInterval Anual: 29 feb bisiesto → 28 feb no bisiesto", addInterval("2028-02-29", "Anual", null, 29), "2029-02-28");

  // Diaria/Semanal/Personalizada.
  eq("addInterval Semanal", addInterval("2026-09-28", "Semanal"), "2026-10-05");
  eq("addInterval Diaria", addInterval("2026-09-28", "Diaria"), "2026-09-29");
  eq("addInterval Personalizada: 45 días", addInterval("2026-09-28", "Personalizada", 45), "2026-11-12");
  eq("addInterval Personalizada: sin días → +30", addInterval("2026-09-28", "Personalizada", null), "2026-10-28");

  // Otras frecuencias con día del mes.
  eq("addInterval Bimestral", addInterval("2026-01-15", "Bimestral", null, 15), "2026-03-15");
  eq("addInterval Trimestral", addInterval("2026-01-15", "Trimestral", null, 15), "2026-04-15");
  eq("addInterval Semestral", addInterval("2026-01-15", "Semestral", null, 15), "2026-07-15");
}

// ─────────────────────────── withDueDay ───────────────────────────
{
  eq("withDueDay: mismo mes, día nuevo (caso Claude)", withDueDay("2026-09-10", 26), "2026-09-26");
  eq("withDueDay: clamp en febrero", withDueDay("2026-02-10", 31), "2026-02-28");
  eq("withDueDay: clamp en febrero bisiesto", withDueDay("2028-02-10", 31), "2028-02-29");
}

// ─────────────────────────── clampDay ───────────────────────────
{
  eq("clampDay: 31 en febrero no bisiesto", clampDay(2026, 2, 31), 28);
  eq("clampDay: 31 en febrero bisiesto", clampDay(2028, 2, 31), 29);
  eq("clampDay: día válido no cambia", clampDay(2026, 8, 15), 15);
}

// ─────────────────────────── firstChargeDate ───────────────────────────
{
  // Caso real Alquiler: start 5 ago, dueDay 10 → primer cobro 10 ago (mismo mes).
  eq("firstChargeDate: dueDay futuro dentro del mes de inicio", firstChargeDate("2026-08-05", "Mensual", null, 10), "2026-08-10");
  // Caso real Claude: start 15 ago, dueDay 10 (ya pasó) → salta a septiembre.
  eq("firstChargeDate: dueDay ya pasado → mes siguiente", firstChargeDate("2026-08-15", "Mensual", null, 10), "2026-09-10");
  // Sin dueDay (o frecuencia sin día del mes): el primer cobro es el propio inicio.
  eq("firstChargeDate: sin dueDay → startDate", firstChargeDate("2026-08-05", "Mensual", null, undefined), "2026-08-05");
  eq("firstChargeDate: Semanal → startDate", firstChargeDate("2026-08-05", "Semanal", null, undefined), "2026-08-05");
}

// ─────────────────────────── subtractInterval ───────────────────────────
{
  eq("subtractInterval Mensual: 15 ene → 15 dic del año anterior", subtractInterval("2026-01-15", "Mensual", null, 15), "2025-12-15");
  eq("subtractInterval Mensual: 31 mar dueDay 31 → 28 feb", subtractInterval("2026-03-31", "Mensual", null, 31), "2026-02-28");
  eq("subtractInterval Bimestral: 31 ene → 30 nov", subtractInterval("2026-01-31", "Bimestral"), "2025-11-30");
  eq("subtractInterval Trimestral", subtractInterval("2026-02-15", "Trimestral", null, 15), "2025-11-15");
  eq("subtractInterval Semestral", subtractInterval("2026-03-15", "Semestral", null, 15), "2025-09-15");
  eq("subtractInterval Semanal", subtractInterval("2026-10-05", "Semanal"), "2026-09-28");
  eq("subtractInterval Diaria (cruza mes)", subtractInterval("2026-10-01", "Diaria"), "2026-09-30");
  eq("subtractInterval Personalizada 45", subtractInterval("2026-11-12", "Personalizada", 45), "2026-09-28");
  eq("subtractInterval Personalizada sin días → -30", subtractInterval("2026-10-28", "Personalizada", null), "2026-09-28");
  eq("subtractInterval Anual: 29 feb → 28 feb", subtractInterval("2028-02-29", "Anual", null, 29), "2027-02-28");

  // ida y vuelta (días que no se clampean)
  for (const f of ["Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"] as const) {
    const x = "2026-05-15";
    eq(`ida y vuelta ${f}`, subtractInterval(addInterval(x, f, null, 15), f, null, 15), x);
  }
  eq("ida y vuelta Semanal", subtractInterval(addInterval("2026-05-15", "Semanal"), "Semanal"), "2026-05-15");
  eq("ida y vuelta Personalizada", subtractInterval(addInterval("2026-05-15", "Personalizada", 45), "Personalizada", 45), "2026-05-15");
}

// ─────────────────────────── monthBounds ───────────────────────────
{
  eq("monthBounds octubre", monthBounds("2026-10-09"), { start: "2026-10-01", end: "2026-10-31" });
  eq("monthBounds febrero bisiesto", monthBounds("2028-02-10"), { start: "2028-02-01", end: "2028-02-29" });
  eq("monthBounds diciembre", monthBounds("2026-12-31"), { start: "2026-12-01", end: "2026-12-31" });
}

// ─────────────────────────── monthStatus / monthCounter ───────────────────────────
const sub = (o: Partial<SubLike>): SubLike => ({
  status: "Activa",
  frequency: "Mensual",
  customIntervalDays: null,
  dueDay: null,
  nextChargeDate: null,
  lastChargedDate: null,
  ...o,
});

// Datos reales (Notion, 2026-10-09)
const claude = (o: Partial<SubLike> = {}) => sub({ dueDay: 26, nextChargeDate: "2026-10-26", lastChargedDate: "2026-09-28", ...o });
const alquiler = (o: Partial<SubLike> = {}) => sub({ dueDay: 10, nextChargeDate: "2026-10-10", lastChargedDate: "2026-09-21", ...o });
const icloud = (o: Partial<SubLike> = {}) => sub({ dueDay: 30, nextChargeDate: "2026-10-30", lastChargedDate: "2026-09-25", ...o });

{
  const real = [claude(), alquiler(), icloud()];
  eq("real 9 oct: contador 0/3", monthCounter(real, "2026-10-09"), { paid: 0, due: 3 });
  eq("real 9 oct: Claude pending", monthStatus(claude(), "2026-10-09"), { kind: "pending", date: "2026-10-26" });
  eq("real 9 oct: Alquiler pending", monthStatus(alquiler(), "2026-10-09").kind, "pending");
  eq("real 9 oct: iCloud pending", monthStatus(icloud(), "2026-10-09").kind, "pending");
  // el mismo estado de Notion visto el 29 sep: los tres ya pagados ese mes
  eq("real 29 sep: contador 3/3", monthCounter(real, "2026-09-29"), { paid: 3, due: 3 });
  eq("real 29 sep: Claude paid con fecha del pago", monthStatus(claude(), "2026-09-29"), { kind: "paid", date: "2026-09-28" });

  eq("Alquiler el 10 oct: today", monthStatus(alquiler(), "2026-10-10"), { kind: "today", date: "2026-10-10" });
  eq("Claude impago el 27 oct: late", monthStatus(claude(), "2026-10-27"), { kind: "late", date: "2026-10-26" });
  eq("contador el 27 oct: Claude late cuenta", monthCounter(real, "2026-10-27"), { paid: 0, due: 3 });

  // Alquiler pagado el 10 oct → next 10 nov, last 10 oct
  const paidRent = alquiler({ nextChargeDate: "2026-11-10", lastChargedDate: "2026-10-10" });
  eq("Alquiler pagado 10 oct, visto el 15 oct", monthStatus(paidRent, "2026-10-15"), { kind: "paid", date: "2026-10-10" });
  eq("1/3 el 15 oct", monthCounter([claude(), paidRent, icloud()], "2026-10-15"), { paid: 1, due: 3 });
  // cambia el mes: el contador vuelve a 0 sin tocar nada en Notion
  eq("1 nov: todo pending otra vez", monthCounter([claude({ nextChargeDate: "2026-11-26", lastChargedDate: "2026-10-27" }), paidRent, icloud({ nextChargeDate: "2026-11-30", lastChargedDate: "2026-10-30" })], "2026-11-01"), { paid: 0, due: 3 });
  eq("1 nov: Alquiler vence 10 nov (pending)", monthStatus(paidRent, "2026-11-01"), { kind: "pending", date: "2026-11-10" });
}

{
  // anual: no le toca este mes
  const anual = sub({ frequency: "Anual", dueDay: 15, nextChargeDate: "2027-03-15", lastChargedDate: "2026-03-14" });
  eq("anual fuera de temporada: later", monthStatus(anual, "2026-10-15").kind, "later");
  eq("anual no entra al contador", monthCounter([anual, claude()], "2026-10-15"), { paid: 0, due: 1 });
  // vencido de septiembre: sigue late y cuenta
  const atrasado = claude({ nextChargeDate: "2026-09-26", lastChargedDate: "2026-08-28" });
  eq("vencido de septiembre visto en octubre: late", monthStatus(atrasado, "2026-10-09"), { kind: "late", date: "2026-09-26" });
  eq("el atrasado cuenta en due", monthCounter([atrasado], "2026-10-09"), { paid: 0, due: 1 });
  // pagado dos períodos adelantado
  const adelantado = alquiler({ nextChargeDate: "2026-12-10", lastChargedDate: "2026-11-10" });
  eq("pagado dos períodos adelantado: paid", monthStatus(adelantado, "2026-10-15").kind, "paid");
  // pausado / sin fechas
  eq("pausado", monthStatus(claude({ status: "Pausada" }), "2026-10-09"), { kind: "paused", date: null });
  eq("pausado no cuenta", monthCounter([claude({ status: "Pausada" })], "2026-10-09"), { paid: 0, due: 0 });
  eq("cancelado no cuenta", monthCounter([claude({ status: "Cancelada" })], "2026-10-09"), { paid: 0, due: 0 });
  eq("sin fechas: none", monthStatus(sub({}), "2026-10-09"), { kind: "none", date: null });
  eq("sin next pero pagado este mes: paid", monthStatus(sub({ lastChargedDate: "2026-10-03" }), "2026-10-09").kind, "paid");
  eq("sin next y pago de otro mes: none", monthStatus(sub({ lastChargedDate: "2026-09-03" }), "2026-10-09").kind, "none");
  // fijo nuevo, sin pagos, primer vencimiento el mes que viene
  eq("nuevo sin pagos con next el mes que viene: later", monthStatus(sub({ dueDay: 10, nextChargeDate: "2026-11-10" }), "2026-10-15").kind, "later");
  // cruce diciembre → enero
  const dic = sub({ dueDay: 10, nextChargeDate: "2027-01-10", lastChargedDate: "2026-12-10" });
  eq("diciembre ya pagado (next en enero): paid", monthStatus(dic, "2026-12-15").kind, "paid");
  eq("enero: pending", monthStatus(dic, "2027-01-02").kind, "pending");
}

// ─────────────────────────── resultado ───────────────────────────
console.log(`\n${passed} checks OK`);
if (failures.length) {
  console.log(`${failures.length} FALLAN:\n`);
  failures.forEach((f) => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("Todo verde.\n");
