// ARS formatting helpers (ported from the design's data.js).

export function fmt(n: number, opts?: { sign?: boolean }): string {
  const o = opts || {};
  const sign = o.sign && n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(Math.round(n));
  const s = abs.toLocaleString("es-AR");
  return (sign ? sign + " " : "") + "$ " + s;
}

export function fmtShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return "$ " + (n / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1).replace(".", ",") + "M";
  if (abs >= 1000) return "$ " + Math.round(n / 1000) + "k";
  return "$ " + Math.round(n);
}
