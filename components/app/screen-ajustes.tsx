"use client";

import { useState, useEffect } from "react";
import { useStore, type DashStyle, type Accent, type AppCurrency } from "./store";
import { Icon } from "./Icon";

const NOTION_TEMPLATE_URL =
  "https://app.notion.com/p/UNA-MONEDITA-copy-3795c48e39b6803da9abf7ab40919b39?source=copy_link";

function NotionSection() {
  const [status, setStatus] = useState<{ configured: boolean; via: "jwt" | "env" | null } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, via: null }));
  }, []);

  const statusLabel = !status
    ? "Comprobando..."
    : status.via === "jwt"
      ? "Conectado"
      : status.via === "env"
        ? "Conectado (servidor)"
        : "No configurado";
  const statusColor = status?.configured ? "var(--green-700)" : "var(--text-3)";

  return (
    <Row label="Notion" hint="Tu base de datos personal. Duplica la plantilla y conecta tu cuenta.">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: statusColor }} />
          <span style={{ fontWeight: 800, fontSize: 14, color: statusColor }}>{statusLabel}</span>
        </div>

        <a
          href={NOTION_TEMPLATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text-1)", fontWeight: 700, fontSize: 13.5, textDecoration: "none", fontFamily: "inherit" }}
        >
          <Icon name="Globe" size={16} stroke={2.2} />
          Abrir plantilla de Notion
        </a>

        <button
          onClick={() => {
            window.location.href = "/setup";
          }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border: "1.5px solid var(--green)", background: "var(--green-soft)", color: "var(--green-700)", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Icon name="Plug" size={16} stroke={2.2} color="var(--green-700)" />
          {status?.via === "jwt" ? "Reconfigurar Notion" : "Conectar Notion"}
        </button>
      </div>
    </Row>
  );
}

type ActionState = { kind: "idle" } | { kind: "busy" } | { kind: "ok"; message: string } | { kind: "error"; message: string };

const DB_ID_LABELS: Record<string, string> = {
  transactions: "Transactions",
  accounts: "Accounts",
  categories: "Categories",
  subscriptions: "Subscriptions",
  budgets: "Budgets",
  fxRates: "FX Rates",
};

function MantenimientoSection() {
  const [migrateState, setMigrateState] = useState<ActionState>({ kind: "idle" });
  const [guideState, setGuideState] = useState<ActionState>({ kind: "idle" });
  const [showConn, setShowConn] = useState(false);
  const [conn, setConn] = useState<{ dbIds: Record<string, string>; parentPageId: string | null } | null>(null);
  const [connLoading, setConnLoading] = useState(false);

  async function runMigrate() {
    if (migrateState.kind === "busy") return;
    setMigrateState({ kind: "busy" });
    try {
      const res = await fetch("/api/subscriptions/migrate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error");
      const added: string[] = data.added ?? [];
      setMigrateState({
        kind: "ok",
        message: added.length ? `Agregado: ${added.join(", ")}` : "Ya estaba al día",
      });
    } catch (err) {
      setMigrateState({ kind: "error", message: err instanceof Error ? err.message : "Error preparando Notion" });
    }
  }

  async function runPublishGuide() {
    if (guideState.kind === "busy") return;
    setGuideState({ kind: "busy" });
    try {
      const res = await fetch("/api/notion/guide", { method: "POST" });
      const data = await res.json();
      // el endpoint manda `detail` con el error crudo de Notion — sin él el
      // mensaje genérico no alcanza para diagnosticar desde el celular
      if (!res.ok) throw new Error([data?.error, data?.detail].filter(Boolean).join(" — ") || "Error");
      setGuideState({ kind: "ok", message: data.url });
    } catch (err) {
      setGuideState({ kind: "error", message: err instanceof Error ? err.message : "Error publicando la guía" });
    }
  }

  async function toggleConn() {
    const next = !showConn;
    setShowConn(next);
    if (next && !conn) {
      setConnLoading(true);
      try {
        const res = await fetch("/api/me?full=1");
        const data = await res.json();
        if (data.dbIds) setConn({ dbIds: data.dbIds, parentPageId: data.parentPageId ?? null });
      } finally {
        setConnLoading(false);
      }
    }
  }

  return (
    <Row label="Mantenimiento" hint="Preparar la base de Notion para gastos fijos y mantener la guía que lee tu agente (Hermes) al día.">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={runMigrate}
          disabled={migrateState.kind === "busy"}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text-1)", fontWeight: 700, fontSize: 13.5, cursor: migrateState.kind === "busy" ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          <Icon name="Database" size={16} stroke={2.2} />
          {migrateState.kind === "busy" ? "Preparando..." : "Preparar Notion"}
        </button>
        {migrateState.kind === "ok" && (
          <div style={{ fontSize: 12, color: "var(--green-700)", fontWeight: 700 }}>{migrateState.message}</div>
        )}
        {migrateState.kind === "error" && (
          <div style={{ fontSize: 12, color: "var(--red-600)", fontWeight: 700 }}>{migrateState.message}</div>
        )}

        <button
          onClick={runPublishGuide}
          disabled={guideState.kind === "busy"}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text-1)", fontWeight: 700, fontSize: 13.5, cursor: guideState.kind === "busy" ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          <Icon name="BookOpen" size={16} stroke={2.2} />
          {guideState.kind === "busy" ? "Publicando..." : "Publicar guía para agentes"}
        </button>
        {guideState.kind === "ok" && (
          <a href={guideState.message} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--green-700)", fontWeight: 700, wordBreak: "break-all" }}>
            {guideState.message}
          </a>
        )}
        {guideState.kind === "error" && (
          <div style={{ fontSize: 12, color: "var(--red-600)", fontWeight: 700, wordBreak: "break-word", lineHeight: 1.4 }}>{guideState.message}</div>
        )}

        <button
          onClick={toggleConn}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 4px", border: "none", background: "transparent", color: "var(--text-3)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}
        >
          Datos de conexión
          <Icon name={showConn ? "ChevronUp" : "ChevronDown"} size={15} stroke={2.2} />
        </button>
        {showConn && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderRadius: 10, background: "var(--bg-2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {connLoading && <div style={{ color: "var(--text-3)" }}>Cargando...</div>}
            {!connLoading && conn && (
              <>
                <div style={{ color: "var(--text-3)" }}>Página principal: {conn.parentPageId ?? "—"}</div>
                {Object.entries(conn.dbIds).map(([key, id]) => (
                  <div key={key} style={{ color: "var(--text-2)" }}>
                    {DB_ID_LABELS[key] ?? key}: {id || "—"}
                  </div>
                ))}
              </>
            )}
            {!connLoading && !conn && <div style={{ color: "var(--text-3)" }}>No disponible</div>}
          </div>
        )}
      </div>
    </Row>
  );
}

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
  const { theme, setTheme, dashStyle, setDashStyle, accent, setAccent, currency, setCurrency } = useStore();
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
        <Row label="Moneda" hint="Usada al registrar nuevos movimientos">
          <Pills value={currency} onChange={(v) => setCurrency(v as AppCurrency)} options={[{ value: "EUR", label: "€ Euro" }, { value: "ARS", label: "$ Peso" }, { value: "USD", label: "US$ Dólar" }]} />
        </Row>

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

        <NotionSection />

        <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />

        <MantenimientoSection />

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
