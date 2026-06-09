"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, Plug, ExternalLink } from "lucide-react";

const NOTION_TEMPLATE_URL =
  "https://app.notion.com/p/UNA-MONEDITA-copy-3795c48e39b6803da9abf7ab40919b39?source=copy_link";
const NOTION_INTEGRATIONS_URL = "https://www.notion.so/my-integrations";

const STEPS: { n: number; title: string; body: string }[] = [
  {
    n: 1,
    title: "Duplica la plantilla",
    body: 'Abre la plantilla con el botón de arriba y pulsa "Duplicar" (arriba a la derecha en Notion). Se copiará "UNA MONEDITA" a tu propia cuenta.',
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

export default function SetupPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notionToken: token.trim(), pageUrl: pageUrl.trim() }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo conectar. Revisa los datos e intenta de nuevo.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

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
    fontSize: 15,
    fontFamily: "inherit",
    fontWeight: 600,
    outline: "none",
  };

  return (
    <div
      className="app-root"
      data-theme="light"
      data-accent="verde"
      style={{ minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, background: "var(--bg)" }}
    >
      <div style={{ width: "100%", maxWidth: 460, padding: "32px 0 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", width: 52, height: 52, borderRadius: 15, background: "var(--green)", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "var(--shadow-fab)" }}>
            <CircleDollarSign size={28} strokeWidth={2.4} color="#fff" />
          </div>
          <h1 className="num" style={{ fontSize: 26, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Conecta tu Notion</h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", fontWeight: 600, lineHeight: 1.45 }}>
            Tu base de datos es privada y vive en tu propia cuenta de Notion.
          </p>
        </div>

        {/* Section A: template + integrations links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <a
            href={NOTION_TEMPLATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", fontWeight: 800, fontSize: 14.5, textDecoration: "none", fontFamily: "inherit", boxShadow: "var(--shadow-fab)" }}
          >
            <ExternalLink size={17} strokeWidth={2.4} />
            Abrir plantilla y duplicar
          </a>
          <a
            href={NOTION_INTEGRATIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text-1)", fontWeight: 700, fontSize: 13.5, textDecoration: "none", fontFamily: "inherit" }}
          >
            <ExternalLink size={16} strokeWidth={2.2} />
            Crear integración de Notion
          </a>
        </div>

        {/* Section B: step-by-step */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: 999, background: "var(--green-soft)", color: "var(--green-700)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13 }}>
                {s.n}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--text)", marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600, lineHeight: 1.45 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Section C: form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor="token" style={labelStyle}>Token de integración</label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ntn_..."
              autoComplete="off"
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="pageUrl" style={labelStyle}>URL de tu página de Notion</label>
            <input
              id="pageUrl"
              type="text"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="https://notion.so/..."
              autoComplete="off"
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13.5, color: "var(--red-600)", background: "var(--red-soft)", borderRadius: 10, padding: "10px 12px", fontWeight: 600, lineHeight: 1.4 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !token || !pageUrl}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading || !token || !pageUrl ? "var(--bg-2)" : "var(--green)", color: loading || !token || !pageUrl ? "var(--text-3)" : "#fff", fontWeight: 800, fontSize: 15, cursor: loading || !token || !pageUrl ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            <Plug size={18} strokeWidth={2.4} />
            {loading ? "Conectando…" : "Conectar"}
          </button>
        </form>
      </div>
    </div>
  );
}
