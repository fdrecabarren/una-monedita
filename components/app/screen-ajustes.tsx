"use client";

import { useState } from "react";
import { useStore, type DashStyle, type Accent } from "./store";
import { Icon } from "./Icon";

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

function Pills<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{ padding: "9px 16px", borderRadius: 999, border: on ? "1.5px solid var(--green)" : "1.5px solid var(--line)", background: on ? "var(--green-soft)" : "var(--surface)", color: on ? "var(--green-700)" : "var(--text-2)", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Ajustes() {
  const { theme, setTheme, dashStyle, setDashStyle, accent, setAccent } = useStore();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "8px 18px 28px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <Row label="Tema">
          <Pills value={theme} onChange={setTheme} options={[{ value: "light", label: "Claro" }, { value: "dark", label: "Oscuro" }]} />
        </Row>

        <Row label="Acento">
          <Pills value={accent} onChange={(v) => setAccent(v as Accent)} options={[{ value: "verde", label: "Verde" }, { value: "teal", label: "Teal" }, { value: "bosque", label: "Bosque" }]} />
        </Row>

        <Row label="Estilo del resumen" hint="A · anillo de iconos · B · leyenda · C · grilla compacta (móvil)">
          <Pills value={dashStyle} onChange={(v) => setDashStyle(v as DashStyle)} options={[{ value: "A", label: "A · Anillo" }, { value: "B", label: "B · Leyenda" }, { value: "C", label: "C · Grilla" }]} />
        </Row>

        <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />

        <button
          onClick={logout}
          disabled={loggingOut}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "13px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--red-600)", fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Icon name="LogOut" size={18} stroke={2.2} color="var(--red-600)" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
