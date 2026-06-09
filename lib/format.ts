// Currency formatting helpers (ported from the design's data.js).

type CurrencyCode = "ARS" | "USD" | "EUR" | string;

// symbol + fractional digits per currency. Default falls back to "$" / 0 decimals.
function currencyMeta(currency?: CurrencyCode): { symbol: string; decimals: number } {
  switch (currency) {
    case "EUR":
      return { symbol: "€", decimals: 2 };
    case "USD":
      return { symbol: "US$", decimals: 2 };
    case "ARS":
    default:
      return { symbol: "$", decimals: 0 };
  }
}

export function fmt(n: number, currency?: CurrencyCode, opts?: { sign?: boolean }): string {
  const o = opts || {};
  const { symbol, decimals } = currencyMeta(currency);
  const sign = o.sign && n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  const s = abs.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (sign ? sign + " " : "") + symbol + " " + s;
}

export function fmtShort(n: number, currency?: CurrencyCode): string {
  const { symbol } = currencyMeta(currency);
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return symbol + " " + (n / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1).replace(".", ",") + "M";
  if (abs >= 1000) return symbol + " " + Math.round(n / 1000) + "k";
  return symbol + " " + Math.round(n);
}
