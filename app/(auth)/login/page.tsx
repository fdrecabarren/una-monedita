"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Error al iniciar sesión.");
        setPassword("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="app-root"
      data-theme="light"
      data-accent="verde"
      style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--bg)", overflow: "hidden" }}
    >
      <img
        src="/bg-login.webp"
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 380,
          background: "color-mix(in srgb, var(--surface) 88%, transparent)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
          borderRadius: 24,
          padding: "36px 28px 28px",
          boxShadow: "var(--shadow-modal)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src="/logo.png"
            alt="UnaMonedita"
            width={60}
            height={60}
            style={{ display: "inline-block", width: 60, height: 60, borderRadius: 16, marginBottom: 16, boxShadow: "var(--shadow-fab)", objectFit: "cover" }}
          />
          <h1 className="num" style={{ fontSize: 28, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>UnaMonedita</h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", fontWeight: 600 }}>Finanzas personales</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label htmlFor="password" style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-3)", marginBottom: 8, fontWeight: 800 }}>
              Contraseña
            </label>
            <input
              ref={inputRef}
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ width: "100%", padding: "13px 15px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 16, fontFamily: "inherit", fontWeight: 600, outline: "none" }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13.5, color: "var(--red-600)", background: "var(--red-soft)", borderRadius: 10, padding: "10px 12px", fontWeight: 600 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading || !password ? "var(--bg-2)" : "var(--green)", color: loading || !password ? "var(--text-3)" : "#fff", fontWeight: 800, fontSize: 15, cursor: loading || !password ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
