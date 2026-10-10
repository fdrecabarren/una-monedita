import type { Metadata } from "next";
import { headers } from "next/headers";
import { getConfigStatus } from "@/lib/auth/session";
import { SetupForm, type SetupReason } from "./setup-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conectar Notion · UnaMonedita",
};

const REASONS: SetupReason[] = ["missing", "expired", "revoked"];

// Puerta de entrada: conectar Notion ES el ingreso (no hay contraseña). Es pública;
// lee la cookie del dispositivo para mostrar si ya está conectado y por qué se llegó
// acá (?reason=).
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string | string[] }>;
}) {
  const h = await headers();
  const status = await getConfigStatus(h.get("cookie") ?? "", h.get("host"));
  const { reason } = await searchParams;
  const r = typeof reason === "string" ? (REASONS as string[]).includes(reason) : false;
  return <SetupForm connected={status.connected} via={status.via} reason={r ? (reason as SetupReason) : null} />;
}
