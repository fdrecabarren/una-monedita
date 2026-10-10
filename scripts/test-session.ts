// Tests de la cookie de conexión a Notion (lib/auth/session.ts). Sin dependencias
// extra: se compila con tsc y se corre con node (ver README, sección Tests).
// Las variables de entorno se setean acá a mano; el nombre de la cookie depende de
// NODE_ENV al cargar el módulo, así que ese caso se prueba en un proceso aparte.

import { execFileSync } from "node:child_process";
import { EncryptJWT, jwtDecrypt } from "jose";

// process.env.NODE_ENV es de solo lectura en los tipos de Next: se escribe por este alias.
const env = process.env as Record<string, string | undefined>;
const SECRET = "test-secret-test-secret-test-secret-123456";
env.AUTH_COOKIE_SECRET = SECRET;
delete env.NOTION_TOKEN;
delete env.NOTION_DB_TRANSACTIONS;
delete env.DEV_AUTH_BYPASS;

import {
  NOTION_COOKIE,
  LEGACY_COOKIE,
  createNotionCookie,
  readNotionCookie,
  readLegacyCreds,
  resolveNotionCreds,
  getConfigStatus,
  getCookie,
  isLocalHost,
  devAuthBypass,
  secretProblem,
  notionCookieOptions,
  notionCookieClearOptions,
  type NotionCreds,
} from "../lib/auth/session";

let passed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else failures.push(`${name}${detail ? ": " + detail : ""}`);
}

function eq<T>(name: string, actual: T, expected: T) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(name, a === e, `esperaba ${e}, obtuvo ${a}`);
}

const creds: NotionCreds = {
  token: "ntn_test_token_1234567890",
  dbIds: { transactions: "db-tx", accounts: "db-ac", categories: "db-ca", subscriptions: "db-su", budgets: "db-bu", fxRates: "db-fx" },
};

const sha = async (text: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
const newKey = () => sha("um_notion:v1:" + SECRET);
const legacyKey = () => sha(SECRET);

async function legacyToken(payload: Record<string, unknown> = {}): Promise<string> {
  return new EncryptJWT({
    auth: true,
    notionToken: "legacy-token-1234567890",
    dbTransactions: "l-tx",
    dbAccounts: "l-ac",
    dbCategories: "l-ca",
    dbSubscriptions: "l-su",
    dbBudgets: "l-bu",
    dbFxRates: "l-fx",
    ...payload,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .encrypt(await legacyKey());
}

async function main() {
  // ---- ida y vuelta ----
  const remembered = await createNotionCookie(creds, true);
  const back = await readNotionCookie(remembered);
  eq("ida y vuelta: credenciales", back?.creds, creds);
  eq("ida y vuelta: remember true", back?.remember, true);
  const shortLived = await createNotionCookie(creds, false);
  eq("remember false se conserva", (await readNotionCookie(shortLived))?.remember, false);

  // vencimiento: 400 días recordando, ~24 h sin recordar
  const expOf = async (t: string) => {
    const { payload } = await jwtDecrypt(t, await newKey(), { audience: "um_notion" });
    return (payload.exp ?? 0) - Math.floor(Date.now() / 1000);
  };
  const longTtl = await expOf(remembered);
  const shortTtl = await expOf(shortLived);
  check("recordar: exp ≈ 400 días", Math.abs(longTtl - 400 * 86400) < 120, String(longTtl));
  check("sin recordar: exp ≈ 24 h", Math.abs(shortTtl - 86400) < 120, String(shortTtl));

  // ---- cookie inválida ----
  const mid = Math.floor(remembered.length / 2);
  const tampered = remembered.slice(0, mid) + (remembered[mid] === "a" ? "b" : "a") + remembered.slice(mid + 1);
  eq("valor adulterado → null", await readNotionCookie(tampered), null);
  eq("vacío → null", await readNotionCookie(""), null);
  eq("null → null", await readNotionCookie(null), null);
  eq("basura → null", await readNotionCookie("no.es.un.jwe"), null);

  const wrongAud = await new EncryptJWT({ kind: "notion", v: 1, remember: true, token: "t", db: creds.dbIds })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setAudience("otra-cosa")
    .setIssuedAt()
    .setExpirationTime("1d")
    .encrypt(await newKey());
  eq("audiencia distinta → null", await readNotionCookie(wrongAud), null);

  const expired = await new EncryptJWT({ kind: "notion", v: 1, remember: true, token: "t", db: creds.dbIds })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setAudience("um_notion")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .encrypt(await newKey());
  eq("vencido → null", await readNotionCookie(expired), null);

  const noToken = await new EncryptJWT({ kind: "notion", v: 1, remember: true, token: "", db: creds.dbIds })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setAudience("um_notion")
    .setIssuedAt()
    .setExpirationTime("1d")
    .encrypt(await newKey());
  eq("token vacío → null", await readNotionCookie(noToken), null);

  // ---- legacy ----
  const legacy = await legacyToken();
  eq("legacy: se lee con readLegacyCreds", (await readLegacyCreds(legacy))?.token, "legacy-token-1234567890");
  eq("legacy: la cookie nueva NO es legacy", await readLegacyCreds(remembered), null);
  eq("legacy: una legacy NO es cookie nueva", await readNotionCookie(legacy), null);
  eq("legacy sin credenciales (login viejo con contraseña) → null", await readLegacyCreds(await legacyToken({ notionToken: undefined, dbTransactions: undefined })), null);
  eq("legacy sin auth:true → null", await readLegacyCreds(await legacyToken({ auth: false })), null);

  // ---- precedencia y resolución ----
  const both = `${NOTION_COOKIE}=${remembered}; ${LEGACY_COOKIE}=${legacy}`;
  const r1 = await resolveNotionCreds(both, "app.example.com");
  eq("cookie nueva gana sobre la legacy", r1?.via, "cookie");
  eq("cookie nueva: token propio", r1?.creds.token, creds.token);
  const r2 = await resolveNotionCreds(`${LEGACY_COOKIE}=${legacy}`, "app.example.com");
  eq("solo legacy → via legacy", r2?.via, "legacy");
  eq("legacy: remember desconocido", r2?.remember, null);
  eq("cookie nueva inválida NO cae a legacy", await resolveNotionCreds(`${NOTION_COOKIE}=${tampered}; ${LEGACY_COOKIE}=${legacy}`, "app.example.com"), null);
  eq("sin cookies → null", await resolveNotionCreds("", "app.example.com"), null);
  eq("estado conectado", await getConfigStatus(`${NOTION_COOKIE}=${shortLived}`, "x.com"), { connected: true, via: "cookie", remember: false });
  eq("estado sin conexión", await getConfigStatus("", "x.com"), { connected: false, via: null, remember: null });

  // ---- parseo del header Cookie ----
  eq("getCookie: encuentra por nombre exacto", getCookie("a=1; um_notion=XYZ; b=2", "um_notion"), "XYZ");
  eq("getCookie: no confunde prefijos", getCookie("xum_notion=1; um_notion_2=2", "um_notion"), null);
  eq("getCookie: nombre duplicado → null", getCookie("um_notion=a; um_notion=b", "um_notion"), null);
  eq("duplicada → no conectado", await resolveNotionCreds(`${NOTION_COOKIE}=${remembered}; ${NOTION_COOKIE}=${remembered}`, "x.com"), null);

  // ---- las credenciales de entorno NUNCA se devuelven fuera del bypass de dev ----
  env.NOTION_TOKEN = "env-token-env-token-1234";
  env.NOTION_DB_TRANSACTIONS = "env-tx";
  eq("env sin bypass → null", await resolveNotionCreds("", "localhost:3000"), null);
  env.DEV_AUTH_BYPASS = "1";
  eq("DEV_AUTH_BYPASS sin NODE_ENV=development → null", await resolveNotionCreds("", "localhost:3000"), null);
  env.NODE_ENV = "production";
  eq("producción + bypass → null", await resolveNotionCreds("", "localhost:3000"), null);
  env.NODE_ENV = "development";
  eq("development + bypass + localhost → env", (await resolveNotionCreds("", "localhost:3000"))?.via, "dev");
  eq("development + bypass + 127.0.0.1 → env", (await resolveNotionCreds("", "127.0.0.1:3000"))?.via, "dev");
  eq("development + bypass + [::1] → env", (await resolveNotionCreds("", "[::1]:3000"))?.via, "dev");
  eq("development + bypass + host ajeno (DNS rebinding) → null", await resolveNotionCreds("", "evil.example.com:3000"), null);
  eq("development + bypass + IP de la red local → null", await resolveNotionCreds("", "192.168.1.20:3000"), null);
  eq("development + bypass + sin host → null", await resolveNotionCreds("", null), null);
  eq("devAuthBypass localhost", devAuthBypass("localhost:3000"), true);
  eq("devAuthBypass host ajeno", devAuthBypass("evil.example.com"), false);
  eq("la cookie gana sobre el entorno", (await resolveNotionCreds(`${NOTION_COOKIE}=${remembered}`, "localhost:3000"))?.via, "cookie");
  env.DEV_AUTH_BYPASS = "0";
  eq("DEV_AUTH_BYPASS=0 → null", await resolveNotionCreds("", "localhost:3000"), null);
  delete env.DEV_AUTH_BYPASS;
  delete env.NOTION_TOKEN;
  delete env.NOTION_DB_TRANSACTIONS;
  delete env.NODE_ENV;

  // ---- isLocalHost ----
  for (const h of ["localhost", "localhost:3000", "LOCALHOST:3100", "127.0.0.1", "127.0.0.1:8080", "[::1]", "[::1]:3000"]) {
    eq(`isLocalHost ${h}`, isLocalHost(h), true);
  }
  for (const h of ["", "evil.com", "localhost.evil.com", "127.0.0.1.nip.io", "192.168.0.2:3000", "0.0.0.0:3000", "app.vercel.app"]) {
    eq(`!isLocalHost ${h || "(vacío)"}`, isLocalHost(h), false);
  }
  eq("!isLocalHost null", isLocalHost(null), false);

  // ---- secretProblem ----
  eq("secreto bueno", secretProblem(), null);
  const saved = env.AUTH_COOKIE_SECRET;
  delete env.AUTH_COOKIE_SECRET;
  check("secreto ausente", secretProblem() !== null);
  env.AUTH_COOKIE_SECRET = "corto";
  check("secreto corto", secretProblem() !== null);
  env.AUTH_COOKIE_SECRET = "cambiame_por_32_chars_random_xxxxxxxxxxxxxxxxxxxxxxx";
  check("secreto de ejemplo de .env.example", (secretProblem() ?? "").includes("ejemplo"));
  env.AUTH_COOKIE_SECRET = saved;

  // ---- opciones de cookie ----
  const on = notionCookieOptions(true, true);
  const off = notionCookieOptions(false, true);
  eq("recordar: maxAge 400 días", on.maxAge, 400 * 86400);
  check("sin recordar: sin maxAge (cookie de sesión)", !("maxAge" in off));
  check("httpOnly + lax + path /", on.httpOnly === true && on.sameSite === "lax" && on.path === "/");
  eq("borrado: maxAge 0 y Secure", [notionCookieClearOptions(true).maxAge, notionCookieClearOptions(true).secure], [0, true]);

  // ---- nombre de la cookie en producción (proceso aparte: se calcula al cargar) ----
  const modulePath = require.resolve("../lib/auth/session");
  const name = (nodeEnv: string) =>
    execFileSync(process.execPath, ["-e", `console.log(require(${JSON.stringify(modulePath)}).NOTION_COOKIE)`], {
      env: { ...env, NODE_ENV: nodeEnv } as NodeJS.ProcessEnv,
      encoding: "utf8",
    }).trim();
  eq("nombre en producción", name("production"), "__Host-um_notion");
  eq("nombre en desarrollo", name("development"), "um_notion");
}

main()
  .then(() => {
    if (failures.length) {
      console.error(`✗ ${failures.length} fallaron (${passed} OK):`);
      for (const f of failures) console.error("  - " + f);
      process.exit(1);
    }
    console.log(`✓ ${passed} checks OK`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
