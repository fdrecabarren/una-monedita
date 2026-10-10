// Defensa CSRF de la API. Función pura (sin Next ni DOM) para poder testearla.
//
// Las cookies son SameSite=Lax: viajan en navegaciones de nivel superior y en
// formularios <form> de OTRO sitio hacia el nuestro. Como /api/setup es público
// (conectar Notion ES el ingreso), un formulario ajeno podría conectar el navegador
// de la víctima al Notion del atacante (login CSRF) y quedarse con todo lo que la
// víctima cargue. Por eso el proxy corta ANTES de las rutas públicas y del bypass:
//   - a la API nunca se llega "navegando" desde otro sitio;
//   - las escrituras exigen mismo origen (Sec-Fetch-Site / Origin);
//   - el cuerpo debe ser JSON: un <form> solo puede enviar urlencoded, multipart o
//     text/plain, así que nunca llega al handler.

export interface CsrfInput {
  method: string;
  pathname: string;
  host: string | null;
  origin: string | null;
  secFetchSite: string | null;
  secFetchMode: string | null;
  contentType: string | null;
  production: boolean;
}

export type CsrfVerdict =
  | { ok: true }
  | { ok: false; status: 403 | 415; code: "csrf" | "content_type" };

const BLOCK: CsrfVerdict = { ok: false, status: 403, code: "csrf" };

export function csrfVerdict(i: CsrfInput): CsrfVerdict {
  if (!i.pathname.startsWith("/api/")) return { ok: true };

  // Cualquier método: abrir la API desde un link de otro sitio.
  if (i.secFetchMode === "navigate" && i.secFetchSite === "cross-site") return BLOCK;

  const method = i.method.toUpperCase();
  const writes = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
  if (!writes) return { ok: true };

  // Navegador moderno: el propio navegador dice de dónde viene el pedido.
  if (i.secFetchSite && i.secFetchSite !== "same-origin") return BLOCK;

  if (i.origin !== null) {
    if (i.origin === "null") return BLOCK; // iframes sandbox, redirects entre orígenes
    let url: URL;
    try {
      url = new URL(i.origin);
    } catch {
      return BLOCK;
    }
    if (url.host !== i.host) return BLOCK;
    if (i.production && url.protocol !== "https:") return BLOCK;
  }
  // Sin Origin ni Sec-Fetch-Site: cliente que no es un navegador (curl, un agente);
  // no lleva la cookie de otra persona, así que no hay nada que proteger.

  if (method !== "DELETE") {
    const ct = (i.contentType ?? "").toLowerCase();
    if (!ct.startsWith("application/json")) return { ok: false, status: 415, code: "content_type" };
  }
  return { ok: true };
}
