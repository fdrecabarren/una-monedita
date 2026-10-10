import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createNotionCookie,
  notionCookieOptions,
  notionCookieClearOptions,
  NOTION_COOKIE,
  LEGACY_COOKIE,
  type NotionCreds,
} from "@/lib/auth/session";
import { checkRateLimit, clientIp } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const NOTION_VERSION = "2022-06-28";

const BodySchema = z.object({
  notionToken: z.string().min(10),
  pageUrl: z.string().min(10),
  // "Recordar en este dispositivo": cookie de 400 días. Sin recordar, se borra al
  // cerrar el navegador (y vence a las 24 h).
  remember: z.boolean().default(true),
});

// Map of database title (as shown in Notion) → key in NotionCreds.dbIds
const DB_TITLE_MAP: Record<string, keyof NotionCreds["dbIds"]> = {
  Categories: "categories",
  Accounts: "accounts",
  "FX Rates": "fxRates",
  Subscriptions: "subscriptions",
  Budgets: "budgets",
  Transactions: "transactions",
};

// Extract a 32-char hex page id from a Notion URL and format as a UUID.
function parsePageId(url: string): string | null {
  const matches = url.match(/[0-9a-fA-F]{32}/g);
  if (!matches || matches.length === 0) return null;
  // Use the LAST 32-hex run — page id sits at the end of the URL.
  const raw = matches[matches.length - 1].toLowerCase();
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

interface ChildBlock {
  type: string;
  id: string;
  child_database?: { title: string };
}

// Conectar Notion ES el ingreso, así que esta ruta es pública (el proxy ya cortó el
// CSRF antes de llegar acá). Cada intento valida un token contra Notion: se limita
// por IP para que no sirva de probador de tokens robados.
export async function POST(request: Request) {
  // segunda capa por si algo se saltea el proxy: solo JSON
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "El contenido debe ser application/json" }, { status: 415 });
  }
  if (!checkRateLimit("setup:" + clientIp(request), 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá 15 minutos." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { notionToken, pageUrl, remember } = parsed.data;

  const pageId = parsePageId(pageUrl);
  if (!pageId) {
    return NextResponse.json(
      { error: "No pude leer el ID de la página desde esa URL. Copia el link completo de tu página de Notion." },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: `Bearer ${notionToken}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };

  // 1. Validate token.
  const meRes = await fetch("https://api.notion.com/v1/users/me", { headers });
  if (!meRes.ok) {
    return NextResponse.json(
      { error: "Token de Notion inválido. Verifica que copiaste el Internal Integration Token completo." },
      { status: 400 }
    );
  }

  // 2. List the page's child blocks (paginated).
  const found: Partial<Record<keyof NotionCreds["dbIds"], string>> = {};
  let cursor: string | undefined;
  try {
    do {
      const u = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
      u.searchParams.set("page_size", "100");
      if (cursor) u.searchParams.set("start_cursor", cursor);
      const res = await fetch(u, { headers });
      if (!res.ok) {
        const status = res.status;
        if (status === 404) {
          return NextResponse.json(
            { error: "La integración no tiene acceso a esa página. En tu página → menú ⋯ → Conexiones → agrega tu integración." },
            { status: 400 }
          );
        }
        const detail = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: `Error de Notion (${status})`, detail },
          { status: 400 }
        );
      }
      const data = (await res.json()) as { results: ChildBlock[]; next_cursor: string | null; has_more: boolean };
      for (const block of data.results) {
        if (block.type === "child_database" && block.child_database) {
          const title = block.child_database.title.trim();
          const key = DB_TITLE_MAP[title];
          if (key) found[key] = block.id;
        }
      }
      cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
    } while (cursor);
  } catch (err) {
    return NextResponse.json(
      { error: "No pude conectar con Notion. Intenta de nuevo.", detail: String(err) },
      { status: 500 }
    );
  }

  // 3. Verify all 6 databases were found.
  const missing = (Object.keys(DB_TITLE_MAP) as string[]).filter(
    (title) => !found[DB_TITLE_MAP[title]]
  );
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `No encontré estas bases de datos en la página: ${missing.join(", ")}. ¿Usaste la plantilla correcta y compartiste la página con la integración?`,
      },
      { status: 400 }
    );
  }

  // 4. Cookie cifrada con las credenciales descubiertas (única credencial de la app).
  const creds: NotionCreds = {
    token: notionToken,
    dbIds: {
      transactions: found.transactions!,
      accounts: found.accounts!,
      categories: found.categories!,
      subscriptions: found.subscriptions!,
      budgets: found.budgets!,
      fxRates: found.fxRates!,
    },
  };
  const cookie = await createNotionCookie(creds, remember);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(NOTION_COOKIE, cookie, notionCookieOptions(remember, new URL(request.url).protocol === "https:"));
  // la cookie de la versión con contraseña ya no se usa
  res.cookies.delete(LEGACY_COOKIE);
  return res;
}

// Desconectar este dispositivo: borra la cookie (idempotente). El token sigue siendo
// válido en Notion: si se pierde un dispositivo hay que regenerarlo en
// notion.so/my-integrations.
export async function DELETE(request: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(NOTION_COOKIE, "", notionCookieClearOptions(new URL(request.url).protocol === "https:"));
  res.cookies.delete(LEGACY_COOKIE);
  return res;
}
