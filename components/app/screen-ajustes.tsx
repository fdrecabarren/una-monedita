"use client";

import { useState, useEffect } from "react";
import { useStore, failureText, type DashStyle, type Accent, type AppCurrency } from "./store";
import { Icon } from "./Icon";
import { Coin } from "./Coin";
import { SegmentedControl } from "./ui";
import { Sheet, SheetHeader, ConfirmRow } from "./Sheet";
import { fmt, parseAmount } from "@/lib/format";

const NOTION_TEMPLATE_URL =
  "https://app.notion.com/p/UNA-MONEDITA-copy-3795c48e39b6803da9abf7ab40919b39?source=copy_link";

// Respuesta de /api/me: la conexión con Notion de ESTE dispositivo.
type Conn = { connected: boolean; via: "cookie" | "legacy" | "dev" | null; remember: boolean | null };

function NotionSection() {
  const [status, setStatus] = useState<Conn | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false, via: null, remember: null }));
  }, []);

  const connected = !!status?.connected;
  const statusLabel = !status
    ? "Comprobando..."
    : !connected
      ? "No conectado"
      : status.via === "dev"
        ? "Conectado (modo desarrollo)"
        : status.remember === false
          ? "Conectado · hasta cerrar el navegador"
          : status.remember
            ? "Conectado · recordado en este dispositivo"
            : "Conectado";
  const statusColor = connected ? "var(--accent-ink)" : "var(--text-3)";

  // Borra la conexión de este dispositivo (la cookie). Solo si el servidor
  // confirma se sale a /setup: si falla, la conexión sigue y se avisa.
  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.location.replace("/setup");
    } catch (err) {
      console.error(err);
      setError("No se pudo desconectar. Probá de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Row label="Notion" hint="Tu base de datos personal. Duplicá la plantilla y conectá tu cuenta.">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: statusColor }} />
          <span style={{ fontWeight: 800, fontSize: 14, color: statusColor }}>{statusLabel}</span>
        </div>

        <a
          href={NOTION_TEMPLATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontWeight: 700, fontSize: 13.5, textDecoration: "none", fontFamily: "inherit" }}
        >
          <Icon name="Globe" size={16} stroke={2.2} />
          Abrir plantilla de Notion
        </a>

        <button
          onClick={() => {
            window.location.href = "/setup";
          }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", minHeight: 44, borderRadius: 12, border: "1.5px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent-ink)", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Icon name="Plug" size={16} stroke={2.2} color="var(--accent-ink)" />
          {connected ? "Cambiar de cuenta de Notion" : "Conectar Notion"}
        </button>

        {connected && status?.via !== "dev" && (
          <>
            <button
              onClick={() => {
                setError(null);
                setConfirming(true);
              }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", minHeight: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--expense)", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}
            >
              <Icon name="LogOut" size={16} stroke={2.2} color="var(--expense)" />
              Desconectar Notion
            </button>
            <div className="caption" style={{ color: "var(--text-3)" }}>
              Si perdés un dispositivo: en notion.so/my-integrations regenerá el token de la integración y volvé a conectar.
            </div>
          </>
        )}
      </div>

      {confirming && (
        <Sheet label="Desconectar Notion" onClose={() => (busy ? undefined : setConfirming(false))}>
          <SheetHeader title="Desconectar Notion" onClose={() => (busy ? undefined : setConfirming(false))} />
          <div style={{ padding: "6px 20px calc(22px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10 }}>
            <ConfirmRow
              question="¿Desconectar Notion de este dispositivo?"
              detail="Tus datos quedan en Notion. Para volver a entrar necesitás tu token y la URL de la página."
              confirmLabel="Desconectar"
              busy={busy}
              onCancel={() => setConfirming(false)}
              onConfirm={disconnect}
            />
            {error && (
              <div role="alert" style={{ fontSize: 13, fontWeight: 700, color: "var(--expense)", textAlign: "center", lineHeight: 1.4 }}>
                {error}
              </div>
            )}
          </div>
        </Sheet>
      )}
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
      const res = await fetch("/api/subscriptions/migrate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
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
      const res = await fetch("/api/notion/guide", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
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
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontWeight: 700, fontSize: 13.5, cursor: migrateState.kind === "busy" ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          <Icon name="Database" size={16} stroke={2.2} />
          {migrateState.kind === "busy" ? "Preparando..." : "Preparar Notion"}
        </button>
        {migrateState.kind === "ok" && (
          <div style={{ fontSize: 12, color: "var(--accent-ink)", fontWeight: 700 }}>{migrateState.message}</div>
        )}
        {migrateState.kind === "error" && (
          <div style={{ fontSize: 12, color: "var(--expense)", fontWeight: 700 }}>{migrateState.message}</div>
        )}

        <button
          onClick={runPublishGuide}
          disabled={guideState.kind === "busy"}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontWeight: 700, fontSize: 13.5, cursor: guideState.kind === "busy" ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          <Icon name="BookOpen" size={16} stroke={2.2} />
          {guideState.kind === "busy" ? "Publicando..." : "Publicar guía para agentes"}
        </button>
        {guideState.kind === "ok" && (
          <a href={guideState.message} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent-ink)", fontWeight: 700, wordBreak: "break-all" }}>
            {guideState.message}
          </a>
        )}
        {guideState.kind === "error" && (
          <div style={{ fontSize: 12, color: "var(--expense)", fontWeight: 700, wordBreak: "break-word", lineHeight: 1.4 }}>{guideState.message}</div>
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
      <div className="eyebrow">{label}</div>
      {children}
      {hint && <div className="caption" style={{ color: "var(--text-3)" }}>{hint}</div>}
    </div>
  );
}

function Pills<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return <SegmentedControl<T> label={label} options={options} value={value} onChange={onChange} stretch />;
}

// Saldo: "¿Cuánta plata tenés hoy?". La app calcula el saldo inicial para que el
// Disponible de hoy sea exactamente lo que escribís (Notion · Accounts.InitialBalance).
function SaldoSection() {
  const { available, setAvailableToday, hasPendingTx, initialBalance, retryHistory, currency, allTx } = useStore();
  const [value, setValue] = useState("");
  const [howOpen, setHowOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const parsed = parseAmount(value);
  const reason =
    available.status === "loading"
      ? "Calculando tu saldo…"
      : hasPendingTx
        ? "Esperá a que se guarde el último movimiento."
        : null;
  const canSave = available.status === "ready" && !hasPendingTx && parsed !== null && !busy;
  const currencies = [...new Set(allTx.map((t) => t.currency))];

  async function save() {
    if (parsed === null) {
      setMsg({ ok: false, text: "Ingresá un número." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await setAvailableToday(Math.round(parsed * 100) / 100);
      setValue("");
      setMsg({ ok: true, text: `Listo. Disponible hoy: ${fmt(parsed, currency)}.` });
    } catch (err) {
      setMsg({ ok: false, text: failureText(err, "No se pudo guardar tu saldo") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Row
      label="Saldo"
      hint="Lo que pongas acá es lo que tenés hoy. Desde ahí, cada gasto resta y cada ingreso suma, y el número no cambia al pasar de mes."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Coin size={30} sprout={available.status === "ready" && available.monthNet > 0} />
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Disponible hoy</div>
            {available.status === "loading" && <div className="skeleton-row" role="status" aria-label="Calculando saldo" style={{ height: 28, width: 140, marginTop: 4 }} />}
            {available.status === "error" && (
              <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13, fontWeight: 700, color: "var(--expense)", lineHeight: 1.4 }}>
                No se pudo calcular tu saldo.
                <button
                  onClick={retryHistory}
                  style={{ minHeight: 44, padding: "0 6px", border: "none", background: "transparent", color: "var(--accent-ink)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Reintentar
                </button>
              </div>
            )}
            {available.status === "ready" && (
              <div className="num-coin" style={{ fontSize: 26, lineHeight: 1.2, color: available.amount < 0 ? "var(--expense)" : "var(--text)" }}>
                {fmt(available.amount, currency)}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="plata-hoy" style={{ fontWeight: 800, fontSize: 14 }}>¿Cuánta plata tenés hoy? (efectivo + banco)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="plata-hoy"
              inputMode="decimal"
              value={value}
              disabled={available.status !== "ready"}
              onChange={(e) => {
                setValue(e.target.value);
                setMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) void save();
              }}
              placeholder="Ej: 1000"
              style={{ flex: 1, minWidth: 0, minHeight: 48, border: "1px solid var(--line)", background: "var(--bg-2)", borderRadius: 12, padding: "12px 14px", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "var(--text)" }}
            />
            <button
              onClick={save}
              disabled={!canSave}
              style={{ minHeight: 48, padding: "0 18px", borderRadius: 12, border: "none", background: canSave ? "var(--accent)" : "var(--bg-2)", color: canSave ? "var(--on-accent)" : "var(--text-3)", fontWeight: 800, fontSize: 14.5, cursor: canSave ? "pointer" : "not-allowed", fontFamily: "inherit" }}
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {reason && <div className="caption" style={{ color: "var(--text-3)" }}>{reason}</div>}
          {msg && (
            <div role={msg.ok ? "status" : "alert"} style={{ fontSize: 13, fontWeight: 700, color: msg.ok ? "var(--income)" : "var(--expense)", lineHeight: 1.4 }}>
              {msg.text}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setHowOpen((o) => !o)}
            aria-expanded={howOpen}
            style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 4, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "var(--accent-ink)", fontWeight: 800, fontSize: 13.5, padding: "0 2px", textAlign: "left" }}
          >
            Cómo se calcula
            <Icon name={howOpen ? "ChevronUp" : "ChevronDown"} size={15} stroke={2.4} color="var(--accent-ink)" />
          </button>
          {howOpen && (
            <div className="caption" style={{ display: "flex", flexDirection: "column", gap: 6, lineHeight: 1.5 }}>
              <span>Disponible hoy = saldo inicial + ingresos − gastos de todo lo fechado hasta hoy.</span>
              <span>
                Saldo inicial guardado: <strong style={{ color: "var(--text)" }}>{initialBalance === null ? "…" : fmt(initialBalance, currency)}</strong>. Se calcula solo al guardar lo que tenés hoy, y puede ser negativo.
              </span>
              {available.status === "ready" && available.futureCount > 0 && (
                <span>
                  Hay {available.futureCount} {available.futureCount === 1 ? "movimiento con fecha futura" : "movimientos con fecha futura"}: se cuentan el día que llegan.
                </span>
              )}
              {currencies.length > 1 && <span>Sumamos movimientos en {currencies.join(" y ")} sin convertir.</span>}
            </div>
          )}
        </div>
      </div>
    </Row>
  );
}

export function Ajustes() {
  const { theme, setTheme, dashStyle, setDashStyle, accent, setAccent, currency, setCurrency, setScreen } = useStore();

  return (
    <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "8px 18px 28px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <button
          onClick={() => setScreen("categorias")}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", minHeight: 52, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "var(--text)" }}
        >
          <Icon name="Tags" size={20} stroke={2} color="var(--text-2)" />
          <span style={{ flex: 1, fontWeight: 800, fontSize: 15 }}>Categorías y presupuestos</span>
          <Icon name="ChevronRight" size={20} stroke={2.2} color="var(--text-3)" />
        </button>

        <Row label="Moneda" hint="Usada al registrar nuevos movimientos">
          <Pills label="Moneda" value={currency} onChange={(v) => setCurrency(v as AppCurrency)} options={[{ value: "EUR", label: "€ Euro" }, { value: "ARS", label: "$ Peso" }, { value: "USD", label: "US$ Dólar" }]} />
        </Row>

        <SaldoSection />

        <Row label="Tema">
          <Pills label="Tema" value={theme} onChange={setTheme} options={[{ value: "system", label: "Automático" }, { value: "light", label: "Claro" }, { value: "dark", label: "Oscuro" }]} />
        </Row>

        <Row label="Acento">
          <Pills label="Acento" value={accent} onChange={(v) => setAccent(v as Accent)} options={[{ value: "verde", label: "Verde" }, { value: "teal", label: "Turquesa" }, { value: "grafito", label: "Grafito" }]} />
        </Row>

        <Row label="Estilo del resumen" hint="Cómo se ve el Resumen en el celular.">
          <Pills label="Estilo del resumen" value={dashStyle} onChange={(v) => setDashStyle(v as DashStyle)} options={[{ value: "A", label: "Anillo" }, { value: "B", label: "Leyenda" }, { value: "C", label: "Grilla" }]} />
        </Row>

        <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />

        <NotionSection />

        <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />

        <MantenimientoSection />
      </div>
    </div>
  );
}
