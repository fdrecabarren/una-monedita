"use client";

// Mini-gráfico de tendencia del Resumen: una barra por balde de bucketsFor(range)
// (día/semana/mes según el largo del rango elegido). Sin librerías — mismo
// enfoque casero que Donut.tsx.
//
// `signed`: los valores negativos salen hacia abajo de una línea base (balance
// por período: ingresos − gastos). Sin negativos se dibuja como barras comunes.

export interface TrendPoint {
  key: string;
  label: string;
  value: number;
}

export function TrendBars({
  data,
  height = 64,
  color = "var(--expense-fill)",
  negativeColor = "var(--expense-fill)",
  signed = false,
  ariaLabel,
}: {
  data: TrendPoint[];
  height?: number;
  color?: string;
  negativeColor?: string;
  signed?: boolean;
  ariaLabel?: string;
}) {
  if (data.length === 0) return null;
  const hasNeg = signed && data.some((d) => d.value < 0);
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const dense = data.length > 20;
  const showLabelEvery = data.length > 12 ? Math.ceil(data.length / 8) : 1;
  // zona de barras: con negativos se parte en dos mitades alrededor de la base.
  // Columna = mitad + base (1) + mitad + etiqueta (14) + 3 gaps de 4 = height + 18.
  const half = hasNeg ? (height - 9) / 2 : height - 6;

  const peak = data.reduce((a, b) => (Math.abs(b.value) > Math.abs(a.value) ? b : a), data[0]);
  const label = ariaLabel ?? `Tendencia. Valor más alto: ${peak.label}, ${Math.round(peak.value)}`;

  return (
    <div role="img" aria-label={label} style={{ display: "flex", alignItems: "stretch", gap: dense ? 2 : 4, height: height + 18, width: "100%" }}>
      {data.map((d, i) => {
        const h = Math.max((Math.abs(d.value) / maxAbs) * half, d.value !== 0 ? 3 : 1);
        const neg = d.value < 0;
        const bar = (
          <div
            style={{
              width: "100%",
              maxWidth: 22,
              height: h,
              borderRadius: 4,
              background: neg ? negativeColor : color,
              opacity: d.value !== 0 ? 0.9 : 0.14,
              transition: "height .2s",
            }}
          />
        );
        return (
          <div
            key={d.key}
            title={`${d.label}: ${Math.round(d.value)}`}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", minWidth: 0 }}
          >
            {hasNeg ? (
              <>
                <div style={{ height: half, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>{!neg && bar}</div>
                <div style={{ height: 1, width: "100%", background: "var(--line-strong)" }} />
                <div style={{ height: half, width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>{neg && bar}</div>
              </>
            ) : (
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>{bar}</div>
            )}
            {!dense || i % showLabelEvery === 0 ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                {d.label}
              </span>
            ) : (
              <span style={{ height: 14 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
