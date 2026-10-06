"use client";

import { useState, useEffect } from "react";
import { useStore, failureText, type DashStyle, type Accent, type AppCurrency } from "./store";
import { Icon } from "./Icon";
import { SegmentedControl } from "./ui";
import { fmt, parseAmount } from "@/lib/format";
import { addDays, startOfDay } from "@/lib/date-range";

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
  const statusColor = status?.configured ? "var(--accent-ink)" : "var(--text-3)";

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
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border: "1.5px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent-ink)", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Icon name="Plug" size={16} stroke={2.2} color="var(--accent-ink)" />
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

// Saldo: interruptor del acumulado + saldo inicial (Notion · Accounts.InitialBalance).
function SaldoSection() {
  const { carryOver, setCarryOver, initialBalance, setInitialBalance, balanceBefore, currency } = useStore();
  const [draft, setDraft] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [todayAmount, setTodayAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const shown = draft ?? (initialBalance === null ? "" : String(initialBalance));
  const dirty = draft !== null && parseAmount(draft) !== initialBalance;
  // saldo contando todo lo registrado hasta hoy (null si el historial no está listo)
  const closingToday = balanceBefore(startOfDay(addDays(new Date(), 1)));
  const canCalc = closingToday !== null && initialBalance !== null;

  async function save() {
    const n = parseAmount(shown);
    if (n === null) {
      setMsg({ ok: false, text: "Ingresá un número." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await setInitialBalance(Math.round(n * 100) / 100);
      setDraft(null);
      setMsg({ ok: true, text: "Saldo inicial guardado." });
    } catch (err) {
      setMsg({ ok: false, text: failureText(err, "No se pudo guardar el saldo inicial") });
    } finally {
      setBusy(false);
    }
  }

  function useToday() {
    const hoy = parseAmount(todayAmount);
    if (hoy === null || closingToday === null || initialBalance === null) {
      setMsg({ ok: false, text: "Ingresá cuánta plata tenés hoy." });
      return;
    }
    // disponible hoy = saldo inicial + movimientos hasta hoy  →  inicial = hoy − movimientos
    const initial = Math.round((hoy - (closingToday - initialBalance)) * 100) / 100;
    setDraft(String(initial));
    setCalcOpen(false);
    setTodayAmount("");
    setMsg({ ok: true, text: `Saldo inicial calculado: ${fmt(initial, currency)}. Tocá Guardar para confirmarlo.` });
  }

  return (
    <Row
      label="Saldo"
      hint="Acumulado: cada período arranca con lo que te quedó del anterior, así ves cuánta plata tenés. Solo del período: se reinicia en cada período."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Pills
          label="Saldo"
          value={carryOver ? "on" : "off"}
          onChange={(v) => setCarryOver(v === "on")}
          options={[{ value: "off", label: "Solo del período" }, { value: "on", label: "Acumulado" }]}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="saldo-inicial" style={{ fontWeight: 800, fontSize: 14 }}>Saldo inicial</label>
          <div className="caption" style={{ color: "var(--text-3)" }}>¿Con cuánta plata arrancaste? Es lo que tenías antes de registrar tu primer movimiento.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="saldo-inicial"
              inputMode="decimal"
              value={shown}
              disabled={initialBalance === null}
              onChange={(e) => {
                setDraft(e.target.value);
                setMsg(null);
              }}
              placeholder={initialBalance === null ? "Cargando…" : "Ej: 150000"}
              style={{ flex: 1, minWidth: 0, minHeight: 48, border: "1px solid var(--line)", background: "var(--bg-2)", borderRadius: 12, padding: "12px 14px", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "var(--text)" }}
            />
            <button
              onClick={save}
              disabled={busy || !dirty}
              style={{ minHeight: 48, padding: "0 18px", borderRadius: 12, border: "none", background: dirty ? "var(--accent)" : "var(--bg-2)", color: dirty ? "var(--on-accent)" : "var(--text-3)", fontWeight: 800, fontSize: 14.5, cursor: busy || !dirty ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {msg && (
            <div role={msg.ok ? "status" : "alert"} style={{ fontSize: 13, fontWeight: 700, color: msg.ok ? "var(--income)" : "var(--expense)", lineHeight: 1.4 }}>
              {msg.text}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setCalcOpen((o) => !o)}
            disabled={!canCalc}
            aria-expanded={calcOpen}
            style={{ minHeight: 44, border: "none", background: "transparent", cursor: canCalc ? "pointer" : "not-allowed", fontFamily: "inherit", color: canCalc ? "var(--accent-ink)" : "var(--text-3)", fontWeight: 800, fontSize: 13.5, padding: "0 2px", textAlign: "left" }}
          >
            Calcularlo desde lo que tengo hoy
          </button>
          {!canCalc && (
            <div className="caption" style={{ color: "var(--text-3)" }}>
              {carryOver ? "Disponible cuando termine de cargar el historial." : "Activá el saldo acumulado para usarlo."}
            </div>
          )}
          {calcOpen && canCalc && (
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input
                aria-label="Plata que tenés hoy"
                inputMode="decimal"
                value={todayAmount}
                onChange={(e) => setTodayAmount(e.target.value)}
                placeholder="¿Cuánta plata tenés hoy?"
                style={{ flex: 1, minWidth: 0, minHeight: 48, border: "1px solid var(--line)", background: "var(--bg-2)", borderRadius: 12, padding: "12px 14px", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "var(--text)" }}
              />
              <button
                onClick={useToday}
                style={{ minHeight: 48, padding: "0 18px", borderRadius: 12, border: "1.5px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent-ink)", fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}
              >
                Calcular
              </button>
            </div>
          )}
        </div>
      </div>
    </Row>
  );
}

export function Ajustes() {
  const { theme, setTheme, dashStyle, setDashStyle, accent, setAccent, currency, setCurrency, setScreen } = useStore();
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
          <Pills label="Acento" value={accent} onChange={(v) => setAccent(v as Accent)} options={[{ value: "verde", label: "Verde" }, { value: "teal", label: "Turquesa" }, { value: "bosque", label: "Bosque" }]} />
        </Row>

        <Row label="Estilo del resumen" hint="Cómo se ve el Resumen en el celular.">
          <Pills label="Estilo del resumen" value={dashStyle} onChange={(v) => setDashStyle(v as DashStyle)} options={[{ value: "A", label: "Anillo" }, { value: "B", label: "Leyenda" }, { value: "C", label: "Grilla" }]} />
        </Row>

        <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />

        <NotionSection />

        <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />

        <MantenimientoSection />

        <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />

        <button
          onClick={logout}
          disabled={loggingOut}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "13px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--expense)", fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Icon name="LogOut" size={18} stroke={2.2} color="var(--expense)" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
