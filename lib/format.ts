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
  if (abs >= 1_000_000)
    return symbol + "\u00a0" + (n / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1).replace(".", ",") + "M";
  if (abs >= 1000) return symbol + "\u00a0" + Math.round(n / 1000) + "k";
  return symbol + "\u00a0" + Math.round(n);
}
