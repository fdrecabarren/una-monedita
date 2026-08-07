"use client";

// Mini-gráfico de tendencia del Resumen: una barra por balde de bucketsFor(range)
// (día/semana/mes según el largo del rango elegido). Sin librerías — mismo
// enfoque casero que Donut.tsx.

export interface TrendPoint {
  key: string;
  label: string;
  value: number;
}

export function TrendBars({
  data,
  height = 64,
  color = "var(--red)",
}: {
  data: TrendPoint[];
  height?: number;
  color?: string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const dense = data.length > 20;
  const showLabelEvery = data.length > 12 ? Math.ceil(data.length / 8) : 1;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: dense ? 2 : 4, height: height + 18, width: "100%" }}>
      {data.map((d, i) => (
        <div
          key={d.key}
          title={`${d.label}: ${Math.round(d.value)}`}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4, height: "100%", minWidth: 0 }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 22,
              height: Math.max((d.value / max) * (height - 6), d.value > 0 ? 3 : 1),
              borderRadius: 4,
              background: color,
              opacity: d.value > 0 ? 0.85 : 0.14,
              transition: "height .2s",
            }}
          />
          {!dense || i % showLabelEvery === 0 ? (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
              {d.label}
            </span>
          ) : (
            <span style={{ height: 12 }} />
          )}
        </div>
      ))}
    </div>
  );
}
