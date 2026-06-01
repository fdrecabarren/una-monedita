"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleDollarSign } from "lucide-react";

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
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--bg)" }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", width: 52, height: 52, borderRadius: 15, background: "var(--green)", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "var(--shadow-fab)" }}>
            <CircleDollarSign size={28} strokeWidth={2.4} color="#fff" />
          </div>
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
