"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Coins } from "@phosphor-icons/react";

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
    <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex w-12 h-12 rounded-[10px] bg-[#111111] items-center justify-center mb-4">
            <Coins size={24} weight="bold" className="text-white" />
          </div>
          <h1
            className="text-2xl tracking-[-0.02em] text-[#111111] mb-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Una Monedita
          </h1>
          <p className="text-sm text-[#787774]">Finanzas personales</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="password"
              className="block text-[11px] uppercase tracking-[0.06em] text-[#787774] mb-2"
            >
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
              className="w-full px-4 py-3 rounded-[8px] bg-white border border-[#EAEAEA] text-[#111111] placeholder-[#B0ADA8] focus:outline-none focus:border-[#111111] text-base transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-[#9F2F2D] bg-[#FDEBEC] border border-[#F5C6C5] rounded-[6px] px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 px-4 rounded-[6px] bg-[#111111] hover:bg-[#333333] disabled:bg-[#F7F6F3] disabled:text-[#B0ADA8] disabled:border disabled:border-[#EAEAEA] text-white font-medium text-sm transition-all active:scale-[0.98]"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
