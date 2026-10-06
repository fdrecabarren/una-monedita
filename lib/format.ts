// Currency formatting helpers (ported from the design's data.js).

type CurrencyCode = "ARS" | "USD" | "EUR" | string;

// symbol + fractional digits per currency. EUR/USD always show cents; ARS shows
// them only when present (centavos are rare but must not be truncated).
function currencyMeta(currency?: CurrencyCode): { symbol: string; minDecimals: number; maxDecimals: number } {
  switch (currency) {
    case "EUR":
      return { symbol: "€", minDecimals: 2, maxDecimals: 2 };
    case "USD":
      return { symbol: "US$", minDecimals: 2, maxDecimals: 2 };
    case "ARS":
    default:
      return { symbol: "$", minDecimals: 0, maxDecimals: 2 };
  }
}

export function fmt(n: number, currency?: CurrencyCode, opts?: { sign?: boolean }): string {
  const o = opts || {};
  const { symbol, minDecimals, maxDecimals } = currencyMeta(currency);
  const sign = o.sign && n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  const s = abs.toLocaleString("es-AR", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
  return (sign ? sign + "\u00a0" : "") + symbol + "\u00a0" + s;
}

// "2026-09-10" → "10 sep". Fecha construida con el constructor local (no
// `new Date(iso)`, que interpreta la fecha como UTC y puede correrse un día).
export function fmtDayMonth(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function fmtShort(n: number, currency?: CurrencyCode): string {
  const { symbol } = currencyMeta(currency);
  const abs = Math.abs(n);
  // signo "\u2212" tipogr\u00e1fico, igual que fmt (el "-" de toString se confunde con un guion)
  const sign = n < 0 && Math.round(abs) !== 0 ? "\u2212\u00a0" : "";
  if (abs >= 1_000_000)
    return sign + symbol + "\u00a0" + (abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1).replace(".", ",") + "M";
  if (abs >= 1000) return sign + symbol + "\u00a0" + Math.round(abs / 1000) + "k";
  return sign + symbol + "\u00a0" + Math.round(abs);
}

// "1.234,56" / "1234.56" / "1234,56" / "  $ 1 234 " → número. null si no es un número.
export function parseAmount(raw: string): number | null {
  let t = raw.replace(/[^\d.,\-−]/g, "").replace("−", "-");
  if (!t || t === "-") return null;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // el último separador es el decimal; el otro es de miles
    t = lastComma > lastDot ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (lastComma >= 0) {
    t = t.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    // 150.000 / 1.234.567: puntos de miles (formato es-AR)
    t = t.replace(/\./g, "");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
