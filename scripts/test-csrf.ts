// Tests de la defensa CSRF de la API (lib/auth/csrf.ts). Se compila con tsc y se
// corre con node (ver README, sección Tests).

import { csrfVerdict, type CsrfInput, type CsrfVerdict } from "../lib/auth/csrf";

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

const HOST = "app.example.com";
// pedido same-origin típico del propio fetch de la app
const base: CsrfInput = {
  method: "POST",
  pathname: "/api/setup",
  host: HOST,
  origin: `https://${HOST}`,
  secFetchSite: "same-origin",
  secFetchMode: "cors",
  contentType: "application/json",
  production: true,
};
const v = (o: Partial<CsrfInput>) => csrfVerdict({ ...base, ...o });
const ok: CsrfVerdict = { ok: true };
const blocked: CsrfVerdict = { ok: false, status: 403, code: "csrf" };
const notJson: CsrfVerdict = { ok: false, status: 415, code: "content_type" };

// ---- el caso feliz ----
eq("POST same-origin JSON → ok", v({}), ok);
eq("PATCH same-origin JSON → ok", v({ method: "PATCH", pathname: "/api/transactions/abc" }), ok);
eq("DELETE same-origin sin cuerpo → ok", v({ method: "DELETE", contentType: null }), ok);
eq("content-type con charset → ok", v({ contentType: "application/json; charset=utf-8" }), ok);
eq("content-type en mayúsculas → ok", v({ contentType: "Application/JSON" }), ok);

// ---- login CSRF: un sitio ajeno intenta conectar la app a SU Notion ----
eq("Origin: null → 403", v({ origin: "null", secFetchSite: null }), blocked);
eq("Origin de otro sitio → 403", v({ origin: "https://evil.example", secFetchSite: null }), blocked);
eq("Sec-Fetch-Site cross-site → 403", v({ secFetchSite: "cross-site" }), blocked);
eq("Sec-Fetch-Site same-site (subdominio hermano) → 403", v({ secFetchSite: "same-site", origin: "https://evil.example.com" }), blocked);
eq("Sec-Fetch-Site same-site aunque el Origin coincida → 403", v({ secFetchSite: "same-site" }), blocked);
eq("Sec-Fetch-Site none en una escritura → 403", v({ secFetchSite: "none" }), blocked);
eq("Origin imposible de parsear → 403", v({ origin: "no-es-una-url", secFetchSite: null }), blocked);
eq("Origin con otro puerto → 403", v({ origin: `https://${HOST}:8443`, secFetchSite: null }), blocked);
eq("Origin http en producción → 403", v({ origin: `http://${HOST}`, secFetchSite: null }), blocked);
eq("Origin http en desarrollo → ok", v({ origin: "http://localhost:3000", host: "localhost:3000", secFetchSite: null, production: false }), ok);
eq("Origin con host distinto de Host → 403", v({ host: null, secFetchSite: null }), blocked);

// ---- clientes que no son navegadores (curl, agentes): no llevan la cookie de nadie ----
eq("sin Origin ni Sec-Fetch-Site → ok", v({ origin: null, secFetchSite: null, secFetchMode: null }), ok);

// ---- un <form> ajeno solo puede mandar estos tipos: nunca llega al handler ----
for (const ct of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data; boundary=x", "", null]) {
  eq(`POST ${ct === null ? "sin content-type" : `'${ct}'`} → 415`, v({ contentType: ct }), notJson);
}
eq("PUT text/plain → 415", v({ method: "PUT", contentType: "text/plain" }), notJson);
eq("403 gana sobre 415 (Origin ajeno + text/plain)", v({ origin: "https://evil.example", secFetchSite: null, contentType: "text/plain" }), blocked);

// ---- GET ----
eq("GET same-origin → ok", v({ method: "GET", contentType: null, secFetchMode: "cors" }), ok);
eq("GET navegando desde otro sitio → 403", v({ method: "GET", contentType: null, secFetchSite: "cross-site", secFetchMode: "navigate", origin: null }), blocked);
eq("GET escribiendo la URL (Sec-Fetch-Site none) → ok", v({ method: "GET", contentType: null, secFetchSite: "none", secFetchMode: "navigate", origin: null }), ok);
eq("GET fetch cross-site (lo frena CORS, no esto) → ok", v({ method: "GET", contentType: null, secFetchSite: "cross-site", secFetchMode: "cors", origin: null }), ok);
eq("HEAD navegando desde otro sitio → 403", v({ method: "HEAD", contentType: null, secFetchSite: "cross-site", secFetchMode: "navigate", origin: null }), blocked);
// el viejo GET /api/seed?reset=1 disparado con un link ajeno
eq("link ajeno a /api/seed?reset=1 → 403", v({ method: "GET", pathname: "/api/seed", contentType: null, secFetchSite: "cross-site", secFetchMode: "navigate", origin: null }), blocked);

// ---- fuera de /api no se mete ----
eq("páginas no pasan por CSRF", v({ pathname: "/setup", method: "POST", origin: "https://evil.example", contentType: "text/plain" }), ok);
eq("/apix no es /api/", v({ pathname: "/apix", origin: "https://evil.example" }), ok);

if (failures.length) {
  console.error(`✗ ${failures.length} fallaron (${passed} OK):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ ${passed} checks OK`);
