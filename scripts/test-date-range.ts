// Tests del motor de rangos (lib/date-range.ts). Sin dependencias: se corre con
//   npx tsx scripts/test-date-range.ts
// Todas las fechas se construyen con el constructor local, así que el archivo
// pasa en cualquier zona horaria.

import {
  rangeFor,
  shiftRange,
  previousRange,
  comparisonRange,
  rangeLabel,
  yearsIn,
  bucketsFor,
  daysBetween,
  addMonthsClamped,
  startOfWeek,
  toISO,
  type DateRange,
} from "../lib/date-range";

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

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
// Representación estable de un rango: "YYYY-MM-DD..YYYY-MM-DD"
const str = (r: DateRange) => `${toISO(r.start)}..${toISO(r.end)}`;

function checkBoundaries(name: string, r: DateRange) {
  check(
    `${name}: start a las 00:00:00.000`,
    r.start.getHours() === 0 && r.start.getMinutes() === 0 && r.start.getSeconds() === 0 && r.start.getMilliseconds() === 0
  );
  check(
    `${name}: end a las 23:59:59.999`,
    r.end.getHours() === 23 && r.end.getMinutes() === 59 && r.end.getSeconds() === 59 && r.end.getMilliseconds() === 999
  );
}

// ─────────────────────────── rangeFor ───────────────────────────
{
  const r = rangeFor("Día", d(2026, 6, 13));
  eq("Día: un solo día", str(r), "2026-06-13..2026-06-13");
  checkBoundaries("Día", r);

  // 2026-08-09 es domingo: la semana debe empezar el lunes 3, no el 10.
  const dom = d(2026, 8, 9);
  check("startOfWeek: el ancla es domingo", dom.getDay() === 0);
  eq("Semana: domingo cae en la semana que empieza el lunes 3", toISO(startOfWeek(dom)), "2026-08-03");
  eq("Semana: lun–dom desde un domingo", str(rangeFor("Semana", dom)), "2026-08-03..2026-08-09");
  eq("Semana: lun–dom desde un lunes", str(rangeFor("Semana", d(2026, 8, 3))), "2026-08-03..2026-08-09");
  checkBoundaries("Semana", rangeFor("Semana", dom));

  eq("Mes: agosto (31 días)", str(rangeFor("Mes", d(2026, 8, 15))), "2026-08-01..2026-08-31");
  eq("Mes: febrero no bisiesto", str(rangeFor("Mes", d(2026, 2, 15))), "2026-02-01..2026-02-28");
  eq("Mes: febrero bisiesto", str(rangeFor("Mes", d(2028, 2, 15))), "2028-02-01..2028-02-29");
  eq("Año", str(rangeFor("Año", d(2026, 5, 7))), "2026-01-01..2026-12-31");
}

// ─────────────────────────── shiftRange ───────────────────────────
{
  eq(
    "shift Día +1 cruzando mes",
    str(shiftRange(rangeFor("Día", d(2026, 8, 31)), "Día", 1)),
    "2026-09-01..2026-09-01"
  );
  eq(
    "shift Día +1 cruzando año",
    str(shiftRange(rangeFor("Día", d(2026, 12, 31)), "Día", 1)),
    "2027-01-01..2027-01-01"
  );
  eq(
    "shift Semana -1",
    str(shiftRange(rangeFor("Semana", d(2026, 8, 5)), "Semana", -1)),
    "2026-07-27..2026-08-02"
  );
  // Un mes corto no debe "contagiar" su largo al mes siguiente.
  eq(
    "shift Mes +1 desde febrero da marzo completo",
    str(shiftRange(rangeFor("Mes", d(2026, 2, 1)), "Mes", 1)),
    "2026-03-01..2026-03-31"
  );
  eq(
    "shift Mes -1 cruzando año",
    str(shiftRange(rangeFor("Mes", d(2026, 1, 10)), "Mes", -1)),
    "2025-12-01..2025-12-31"
  );
  eq("shift Año +1", str(shiftRange(rangeFor("Año", d(2026, 3, 3)), "Año", 1)), "2027-01-01..2027-12-31");

  // Personalizado: se mueve por el largo del propio rango (13–27 jun = 15 días).
  const custom: DateRange = { start: d(2026, 6, 13), end: rangeFor("Día", d(2026, 6, 27)).end };
  eq("Personalizado: largo", daysBetween(custom.start, custom.end), 15);
  eq("shift Personalizado -1", str(shiftRange(custom, "Personalizado", -1)), "2026-05-29..2026-06-12");
  eq("shift Personalizado +1", str(shiftRange(custom, "Personalizado", 1)), "2026-06-28..2026-07-12");
}

// ────────────────── previousRange vs comparisonRange ──────────────────
{
  // previousRange respeta su contrato: mismo largo, tramo inmediatamente anterior.
  const feb = rangeFor("Mes", d(2026, 2, 15));
  eq("previousRange(febrero) = 28 días previos", str(previousRange(feb)), "2026-01-04..2026-01-31");

  // comparisonRange es la que usa el Resumen: para períodos fijos compara contra
  // el período anterior COMPLETO, no contra un tramo del mismo largo.
  eq("comparisonRange(febrero) = enero completo", str(comparisonRange(feb, "Mes")), "2026-01-01..2026-01-31");
  eq(
    "comparisonRange(marzo) = febrero completo",
    str(comparisonRange(rangeFor("Mes", d(2026, 3, 10)), "Mes")),
    "2026-02-01..2026-02-28"
  );
  eq(
    "comparisonRange(2026) = 2025 completo",
    str(comparisonRange(rangeFor("Año", d(2026, 7, 1)), "Año")),
    "2025-01-01..2025-12-31"
  );
  eq(
    "comparisonRange(Día) = día anterior",
    str(comparisonRange(rangeFor("Día", d(2026, 3, 1)), "Día")),
    "2026-02-28..2026-02-28"
  );
  eq(
    "comparisonRange(Semana) = semana anterior",
    str(comparisonRange(rangeFor("Semana", d(2026, 8, 5)), "Semana")),
    "2026-07-27..2026-08-02"
  );
  // Para Personalizado sí es "mismo largo, inmediatamente antes".
  const custom: DateRange = { start: d(2026, 6, 13), end: rangeFor("Día", d(2026, 6, 27)).end };
  eq("comparisonRange(Personalizado)", str(comparisonRange(custom, "Personalizado")), "2026-05-29..2026-06-12");
}

// ─────────────────────────── yearsIn ───────────────────────────
{
  eq("yearsIn: dentro de un año", yearsIn(rangeFor("Mes", d(2026, 6, 1))), [2026]);
  const cross: DateRange = { start: d(2025, 12, 20), end: rangeFor("Día", d(2026, 1, 10)).end };
  eq("yearsIn: cruza de año", yearsIn(cross), [2025, 2026]);
  const three: DateRange = { start: d(2024, 11, 1), end: rangeFor("Día", d(2026, 2, 1)).end };
  eq("yearsIn: abarca tres años", yearsIn(three), [2024, 2025, 2026]);
}

// ─────────────────────────── daysBetween / DST ───────────────────────────
{
  eq("daysBetween: mismo día = 1", daysBetween(d(2026, 5, 5), d(2026, 5, 5)), 1);
  eq("daysBetween: agosto completo", daysBetween(d(2026, 8, 1), d(2026, 8, 31)), 31);
  // Cambio de hora en la UE: 29/03/2026 (adelanta) y 25/10/2026 (atrasa).
  eq("daysBetween: cruza el cambio de hora de marzo", daysBetween(d(2026, 3, 28), d(2026, 3, 30)), 3);
  eq("daysBetween: cruza el cambio de hora de octubre", daysBetween(d(2026, 10, 24), d(2026, 10, 26)), 3);
  eq("daysBetween: marzo completo (con DST)", daysBetween(d(2026, 3, 1), d(2026, 3, 31)), 31);
  eq("daysBetween: octubre completo (con DST)", daysBetween(d(2026, 10, 1), d(2026, 10, 31)), 31);
}

// ─────────────────────────── addMonthsClamped ───────────────────────────
{
  eq("addMonthsClamped: 31 ene + 1 mes = 28 feb", toISO(addMonthsClamped(d(2026, 1, 31), 1)), "2026-02-28");
  eq("addMonthsClamped: 31 ene + 1 mes (bisiesto) = 29 feb", toISO(addMonthsClamped(d(2028, 1, 31), 1)), "2028-02-29");
  eq("addMonthsClamped: 15 mar - 3 meses", toISO(addMonthsClamped(d(2026, 3, 15), -3)), "2025-12-15");
}

// ─────────────────────────── bucketsFor ───────────────────────────
{
  // Cobertura: los baldes deben cubrir el rango exacto, sin huecos ni solapes.
  function assertCoverage(name: string, r: DateRange) {
    const bs = bucketsFor(r);
    check(`${name}: al menos un balde`, bs.length > 0);
    check(`${name}: arranca en el inicio del rango`, toISO(bs[0].start) === toISO(r.start), `balde0=${toISO(bs[0].start)} rango=${toISO(r.start)}`);
    check(
      `${name}: termina en el fin del rango`,
      toISO(bs[bs.length - 1].end) === toISO(r.end),
      `últimoBalde=${toISO(bs[bs.length - 1].end)} rango=${toISO(r.end)}`
    );
    for (let i = 1; i < bs.length; i++) {
      const prevEnd = bs[i - 1].end;
      const gap = daysBetween(prevEnd, bs[i].start); // 2 = consecutivos
      check(`${name}: baldes contiguos en ${i}`, gap === 2, `hueco/solape de ${gap - 2} días`);
    }
    const total = bs.reduce((sum, b) => sum + daysBetween(b.start, b.end), 0);
    eq(`${name}: los baldes suman los días del rango`, total, daysBetween(r.start, r.end));
  }

  const quincena: DateRange = { start: d(2026, 6, 13), end: rangeFor("Día", d(2026, 6, 27)).end };
  eq("bucketsFor: 15 días → 15 baldes diarios", bucketsFor(quincena).length, 15);
  assertCoverage("15 días", quincena);

  const mes31 = rangeFor("Mes", d(2026, 8, 1));
  eq("bucketsFor: 31 días → diario", bucketsFor(mes31).length, 31);
  assertCoverage("mes de 31 días", mes31);

  // 32 días: cruza el umbral a semanal.
  const d32: DateRange = { start: d(2026, 8, 1), end: rangeFor("Día", d(2026, 9, 1)).end };
  eq("bucketsFor: 32 días → largo", daysBetween(d32.start, d32.end), 32);
  check("bucketsFor: 32 días → semanal (menos baldes que días)", bucketsFor(d32).length < 32);
  assertCoverage("32 días", d32);

  const semestre: DateRange = { start: d(2026, 1, 1), end: rangeFor("Día", d(2026, 6, 30)).end };
  assertCoverage("semestre", semestre);

  const anio = rangeFor("Año", d(2026, 1, 1));
  eq("bucketsFor: un año → 12 baldes mensuales", bucketsFor(anio).length, 12);
  assertCoverage("año completo", anio);

  const dosAnios: DateRange = { start: d(2025, 3, 15), end: rangeFor("Día", d(2026, 4, 20)).end };
  assertCoverage("rango de dos años", dosAnios);

  const unDia = rangeFor("Día", d(2026, 6, 13));
  eq("bucketsFor: un día → un balde", bucketsFor(unDia).length, 1);
  assertCoverage("un día", unDia);
}

// ─────────────────────────── rangeLabel ───────────────────────────
{
  const hoy = new Date();
  eq("label Día: hoy", rangeLabel(rangeFor("Día", hoy), "Día"), "Hoy");
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  eq("label Día: ayer", rangeLabel(rangeFor("Día", ayer), "Día"), "Ayer");
  eq("label Mes", rangeLabel(rangeFor("Mes", d(2026, 8, 1)), "Mes"), "Agosto 2026");
  eq("label Año", rangeLabel(rangeFor("Año", d(2026, 1, 1)), "Año"), "2026");

  const custom: DateRange = { start: d(2026, 6, 13), end: rangeFor("Día", d(2026, 6, 27)).end };
  const thisYear = new Date().getFullYear();
  if (thisYear === 2026) {
    eq("label Personalizado (mismo año que hoy)", rangeLabel(custom, "Personalizado"), "13 jun – 27 jun");
  }
  const crossYear: DateRange = { start: d(2025, 12, 20), end: rangeFor("Día", d(2026, 1, 10)).end };
  eq("label Personalizado cruzando año lleva ambos años", rangeLabel(crossYear, "Personalizado"), "20 dic 2025 – 10 ene 2026");
}

// ─────────────────────────── resultado ───────────────────────────
console.log(`\n${passed} checks OK`);
if (failures.length) {
  console.log(`${failures.length} FALLAN:\n`);
  failures.forEach((f) => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("Todo verde.\n");
