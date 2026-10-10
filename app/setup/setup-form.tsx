"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plug, ExternalLink } from "lucide-react";

const NOTION_TEMPLATE_URL =
  "https://app.notion.com/p/UNA-MONEDITA-copy-3795c48e39b6803da9abf7ab40919b39?source=copy_link";
const NOTION_INTEGRATIONS_URL = "https://www.notion.so/my-integrations";
// Marca que deja un /setup exitoso: si volvemos acá enseguida sin conexión, el
// navegador no guardó la cookie (modo privado, cookies bloqueadas).
const JUST_CONNECTED = "um.justConnected";

export type SetupReason = "missing" | "expired" | "revoked";

const REASON_TEXT: Record<SetupReason, string> = {
  missing: "Conectá tu Notion para entrar.",
  expired: "Tu conexión venció. Volvé a conectar.",
  revoked: "Notion rechazó el token (¿lo regeneraste o quitaste la conexión de la página?). Pegá el nuevo.",
};

const STEPS: { n: number; title: string; body: string }[] = [
  {
    n: 1,
    title: "Duplicá la plantilla",
    body: 'Abrí la plantilla con el botón de arriba y tocá "Duplicar" (arriba a la derecha en Notion). Se copiará "UNA MONEDITA" a tu propia cuenta.',
  },
  {
    n: 2,
    title: "Crea una integración",
    body: 'Entra a notion.so/my-integrations → "New integration". Ponle un nombre (ej. UNA MONEDITA), créala y copia el "Internal Integration Token".',
  },
  {
    n: 3,
    title: "Conecta la integración a tu página",
    body: "En tu página duplicada, arriba a la derecha pulsa el menú ⋯ → Conexiones (Connections) → busca y agrega tu integración.",
  },
  {
    n: 4,
    title: "Copia la URL de tu página",
    body: 'En tu página duplicada pulsa "Compartir" (Share) → "Copiar enlace" (Copy link). Esa es la URL que pegarás abajo.',
  },
  {
    n: 5,
    title: "Conecta",
    body: "Pega el token y la URL en el formulario y pulsa Conectar. La app encontrará tus bases de datos automáticamente.",
  },
];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  color: "var(--text-3)",
  marginBottom: 8,
  fontWeight: 800,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  borderRadius: 12,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  color: "var(--text)",
  fontSize: 16,
  fontFamily: "inherit",
  fontWeight: 600,
};

function Steps() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {STEPS.map((s) => (
        <div key={s.n} style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-ink)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13 }}>
            {s.n}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--text)", marginBottom: 2 }}>{s.title}</div>
            <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600, lineHeight: 1.45 }}>{s.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConnectFlow() {
  const [token, setToken] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [remember, setRemember] = useState(true);
  // La app instalada (PWA) ya es "este dispositivo": siempre recuerda.
  const [standalone, setStandalone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee una API del navegador (no existe en el servidor)
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notionToken: token.trim(), pageUrl: pageUrl.trim(), remember: standalone || remember }),
      });
      if (res.ok) {
        try {
          sessionStorage.setItem(JUST_CONNECTED, "1");
        } catch {
          /* ignore */
        }
        // navegación completa: así el servidor lee la cookie recién guardada
        window.location.replace("/");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo conectar. Revisá los datos y probá de nuevo.");
    } catch {
      setError("Error de conexión.");
    }
    setLoading(false);
  }

  const disabled = loading || !token || !pageUrl;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <a
          href={NOTION_TEMPLATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 800, fontSize: 14.5, textDecoration: "none", fontFamily: "inherit", boxShadow: "var(--shadow-fab)" }}
        >
          <ExternalLink size={17} strokeWidth={2.4} />
          Abrir plantilla y duplicar
        </a>
        <a
          href={NOTION_INTEGRATIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", fontWeight: 700, fontSize: 13.5, textDecoration: "none", fontFamily: "inherit" }}
        >
          <ExternalLink size={16} strokeWidth={2.2} />
          Crear integración de Notion
        </a>
      </div>

      <Steps />

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor="pageUrl" style={labelStyle}>URL de tu página de Notion</label>
          <input
            id="pageUrl"
            name="username"
            type="text"
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            placeholder="https://notion.so/..."
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="token" style={labelStyle}>Token de integración</label>
          <input
            id="token"
            name="password"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ntn_..."
            autoComplete="current-password"
            style={inputStyle}
          />
        </div>

        {!standalone && (
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, cursor: "pointer", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: "var(--accent)" }}
              />
              Recordar en este dispositivo
            </label>
            <div style={{ fontSize: 12.5, color: "var(--text-3)", fontWeight: 600, lineHeight: 1.4 }}>
              Desmarcalo en una compu compartida: se borra al cerrar el navegador.
            </div>
          </div>
        )}

        {error && (
          <p role="alert" style={{ fontSize: 13.5, color: "var(--expense)", background: "var(--expense-soft)", borderRadius: 10, padding: "10px 12px", fontWeight: 600, lineHeight: 1.4 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={disabled}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", minHeight: 48, padding: "14px", borderRadius: 12, border: "none", background: disabled ? "var(--bg-2)" : "var(--accent)", color: disabled ? "var(--text-3)" : "var(--on-accent)", fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          <Plug size={18} strokeWidth={2.4} />
          {loading ? "Conectando…" : "Conectar"}
        </button>

        <p style={{ fontSize: 12.5, color: "var(--text-3)", fontWeight: 600, lineHeight: 1.45, textAlign: "center" }}>
          Conectá solo en una instalación tuya o de alguien de confianza: el servidor usa tu token para leer tu Notion.
        </p>
      </form>
    </div>
  );
}

export function SetupForm({
  connected,
  via,
  reason,
}: {
  connected: boolean;
  via: "cookie" | "legacy" | "dev" | null;
  reason: SetupReason | null;
}) {
  // Si recién se conectó y volvió sin conexión, el navegador no guardó la cookie.
  const [lostCookie, setLostCookie] = useState(false);
  useEffect(() => {
    try {
      const mark = sessionStorage.getItem(JUST_CONNECTED);
      if (mark) {
        sessionStorage.removeItem(JUST_CONNECTED);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- lee sessionStorage (no existe en el servidor)
        if (!connected && reason === "missing") setLostCookie(true);
      }
    } catch {
      /* ignore */
    }
  }, [connected, reason]);

  // Con el token rechazado la cookie sigue "válida" pero ya no sirve: se pide el nuevo
  // en vez de ofrecer "Ir a la app" (que volvería acá).
  const showConnected = connected && reason !== "revoked";

  const banner = lostCookie
    ? "Tu navegador no guardó la conexión (¿modo privado o cookies bloqueadas?). Probá en una ventana normal."
    : reason
      ? REASON_TEXT[reason]
      : null;

  return (
    <div
      className="app-root"
      data-theme="light"
      data-accent="verde"
      style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, background: "var(--bg)", overflow: "hidden" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg-login.webp"
        alt=""
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          margin: "16px 0 32px",
          background: "color-mix(in srgb, var(--surface) 90%, transparent)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
          borderRadius: 24,
          padding: "32px 24px 28px",
          boxShadow: "var(--shadow-modal)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="UnaMonedita"
            width={60}
            height={60}
            style={{ display: "inline-block", width: 60, height: 60, borderRadius: 16, marginBottom: 14, boxShadow: "var(--shadow-fab)", objectFit: "cover" }}
          />
          <h1 className="num" style={{ fontSize: 26, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>UnaMonedita</h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", fontWeight: 600, lineHeight: 1.45 }}>
            Finanzas personales. Tu base de datos es privada y vive en tu propia cuenta de Notion.
          </p>
        </div>

        {banner && (
          <p role="status" style={{ fontSize: 13.5, color: "var(--text)", background: "var(--accent-soft)", borderRadius: 10, padding: "10px 12px", fontWeight: 700, lineHeight: 1.4, marginBottom: 20 }}>
            {banner}
          </p>
        )}

        {showConnected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px" }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Ya estás conectado</div>
              <div className="caption">
                {via === "dev" ? "Modo desarrollo: usa el Notion de .env.local." : "Este dispositivo ya tiene tu Notion conectado."}
              </div>
              <Link
                href="/"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: 12, background: "var(--accent)", color: "var(--on-accent)", fontWeight: 800, fontSize: 15, textDecoration: "none" }}
              >
                Ir a la app
              </Link>
            </div>
            <details>
              <summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", fontWeight: 800, fontSize: 14, color: "var(--accent-ink)" }}>
                Conectar otra cuenta de Notion
              </summary>
              <div style={{ paddingTop: 12 }}>
                <ConnectFlow />
              </div>
            </details>
          </div>
        ) : (
          <ConnectFlow />
        )}
      </div>
    </div>
  );
}
