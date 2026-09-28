// Tests del motor de recurrencia (lib/recurrence.ts). Sin dependencias: se corre con
//   npx tsx scripts/test-recurrence.ts

import { addInterval, withDueDay, firstChargeDate, clampDay } from "../lib/recurrence";

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

// ─────────────────────────── resultado ───────────────────────────
console.log(`\n${passed} checks OK`);
if (failures.length) {
  console.log(`${failures.length} FALLAN:\n`);
  failures.forEach((f) => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("Todo verde.\n");
