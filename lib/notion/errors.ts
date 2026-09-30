import { NextResponse } from "next/server";
import { APIResponseError } from "@notionhq/client";

// Respuesta 502 uniforme para fallos de Notion en las rutas de la API. Loguea
// el error completo en el servidor (Vercel → Logs, filtrar por `[op]`) y le
// devuelve al cliente `code` + `message` para que el toast diga el motivo real
// en vez de un genérico. Nunca incluye el token: solo el error que devuelve
// Notion, que no lo repite.
export function notionErrorResponse(op: string, err: unknown, fallback = "No se pudo guardar en Notion") {
  console.error(`[${op}] failed:`, err);
  const code = APIResponseError.isAPIResponseError(err) ? err.code : undefined;
  const message = err instanceof Error ? err.message.slice(0, 300) : undefined;
  return NextResponse.json({ error: fallback, code, message }, { status: 502 });
}
