import { NextResponse } from "next/server";
import { APIResponseError } from "@notionhq/client";

// Notion rechazó el token (revocado, regenerado o la página dejó de compartirse con
// la integración). Cubre el SDK (APIResponseError) y los helpers REST de client.ts,
// que lanzan un Error con "... error 401: ...".
export function isNotionUnauthorized(err: unknown): boolean {
  if (APIResponseError.isAPIResponseError(err)) return err.code === "unauthorized";
  return err instanceof Error && /^Notion [\w ]*error 401\b/.test(err.message);
}

// Respuesta 502 uniforme para fallos de Notion en las rutas de la API. Loguea
// el error completo en el servidor (Vercel → Logs, filtrar por `[op]`) y le
// devuelve al cliente `code` + `message` para que el toast diga el motivo real
// en vez de un genérico. Nunca incluye el token: solo el error que devuelve
// Notion, que no lo repite. Si Notion rechazó el token responde 401 (el cliente
// lo trata como "sin conexión" y lleva a /setup).
export function notionErrorResponse(op: string, err: unknown, fallback = "No se pudo guardar en Notion") {
  console.error(`[${op}] failed:`, err);
  if (isNotionUnauthorized(err)) {
    return NextResponse.json({ error: "Notion rechazó el token", code: "notion_token_invalid" }, { status: 401 });
  }
  const code = APIResponseError.isAPIResponseError(err) ? err.code : undefined;
  const message = err instanceof Error ? err.message.slice(0, 300) : undefined;
  return NextResponse.json({ error: fallback, code, message }, { status: 502 });
}
