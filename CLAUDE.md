# Una Monedita — CLAUDE.md

App de finanzas personales de Franco Recabarren. Registra gastos e ingresos en Notion desde el celular en <10s, analiza reportes en desktop.

**URL producción:** https://una-monedita-three.vercel.app  
**Dev local:** `pnpm dev` → http://localhost:3000 (o 3001 si 3000 ocupado)  
**Red local:** http://100.66.44.7:3001

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind v4, pnpm
- Notion como base de datos (workspace "Notion de Franco Recabarren")
- Integración Notion: "UNA MONEDITA"
- jose (JWT auth), zod v4
- **lucide-react** (iconos — estilo Monefy, NO Phosphor)
- Vercel deployment (proyecto `una-monedita`, team `franco-s-projects02`, user `francorecabarren-8052`; projectId `prj_KtMp6hZWEoPSIcVIKI1kiEZuIEsz`)

## Design system: Monefy/UnaMonedita (warm + verde, claro/oscuro)

Reemplaza al viejo minimalist-ui. Definido en `app/globals.css` con CSS vars por tema.
- App = SPA client-side estilo Monefy: 4 pantallas (Resumen donut, Movimientos, Calendario, Categorías) + Ajustes, navegación interna.
- Fuentes: **Nunito** (`--font-app`, UI), **Fraunces** (`--font-serif`, números display `.num`), Geist Mono.
- Acento verde `--green` (variantes teal/bosque vía `[data-accent]`). Tema claro/oscuro vía `[data-theme]` en `.app-root`.
- Paleta categorías `--cat-*`; gastos rojo `--red`, ingresos verde `--green`.
- Iconos: **lucide-react** vía `lib/icon-registry.ts` (registro explícito ~180 nombres, tree-shaken) + `components/app/Icon.tsx`.
- Categorías guardan `Icon` (nombre Lucide PascalCase) + `Color` (hex) en Notion.
- Tienda de Iconos: catálogo en `lib/icon-catalog.ts` (`GROUPS`, `COLORS`, `ALL`).
- Preferencias (theme/dashStyle/accent) persisten en localStorage (`um.theme/um.dash/um.accent`).

## Notion — IDs y caveats críticos

```
NOTION_TOKEN=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
NOTION_PARENT_PAGE_ID=36d5c48e-39b6-8096-ada7-ddbef6dbefa8
NOTION_DB_TRANSACTIONS=36d5c48e-39b6-8172-ba4b-c2c59fa3fe6f
NOTION_DB_ACCOUNTS=36d5c48e-39b6-812a-864a-df660a69585e
NOTION_DB_CATEGORIES=36d5c48e-39b6-8193-b122-ce5da3528802
NOTION_DB_SUBSCRIPTIONS=36d5c48e-39b6-81fd-b57c-c1d4033101e1
NOTION_DB_BUDGETS=36d5c48e-39b6-81b5-be41-ed826914438b
NOTION_DB_FX_RATES=36d5c48e-39b6-8195-b489-d81b1bd2b9c8
```

**@notionhq/client v5 — cambio crítico:**
- `databases.query` REMOVIDO del SDK
- `dataSources.query` requiere DS IDs inaccesibles via integration token
- **USAR SIEMPRE** `queryDatabase()` de `lib/notion/client.ts` — llama REST `/v1/databases/{id}/query` directo
- `pages.create` y `pages.update` siguen funcionando vía SDK normal
- `pages.update` con `in_trash: true` para borrar

## Auth

- Cookie: `um_session` (JWT firmado con `AUTH_COOKIE_SECRET`)
- Proxy auth: `proxy.ts` en raíz (Next.js 16 usa `proxy.ts`, NO `middleware.ts`)
- La función debe exportarse como `proxy` (no `middleware`)
- Rutas públicas: `/login`, `/api/auth`, `/api/seed`

## Estructura de páginas

SPA: única ruta visible `/dashboard` renderiza `<AppRoot>` (server fetch inicial → client). Navegación entre pantallas es interna por store (`screen`), NO por rutas. `app/(app)/page.tsx` redirige a `/dashboard`. `/login` aparte.

| Pantalla (interna) | Estado |
|------|--------|
| Resumen (donut A/B/C) | ✅ |
| Movimientos (agrupado + edición) | ✅ |
| Calendario (grilla + detalle día) | ✅ |
| Categorías (CRUD + Tienda Iconos) | ✅ |
| Ajustes (tema/acento/dashStyle/logout) | ✅ |

## API Routes

| Ruta | Método | Función |
|------|--------|---------|
| `/api/auth` | POST/DELETE | Login / Logout (cookie JWT) |
| `/api/seed` | GET | Seedea set diseño si vacío; `?reset=1` archiva todo + reseedea |
| `/api/transactions` | GET | Lista por año (`?year=YYYY`, paginado) |
| `/api/transactions` | POST | Crea transacción |
| `/api/transactions/[id]` | PATCH/DELETE | Edita / borra (`in_trash`) |
| `/api/categories` | GET | Lista (`?kind=Gasto\|Ingreso`) |
| `/api/categories` | POST | Crea categoría (name, kind, icon, color) |
| `/api/categories/[id]` | PATCH/DELETE | Edita / archiva (soft-delete) |

## Categorías (set Monefy actual)

**Gasto:** Comida·Utensils, Supermercado·ShoppingCart, Transporte·Car, Casa·House, Servicios·Plug, Ropa·Shirt, Ocio·Gamepad2, Salud·HeartPulse, Café·Coffee, Mascotas·PawPrint, Educación·GraduationCap, Regalos·Gift  
**Ingreso:** Salario·Wallet, Changas·Briefcase, Ahorros·PiggyBank  
(cada una con color hex — ver `app/api/seed/route.ts`)

## Componentes clave (`components/app/`)

- `AppRoot.tsx` — StoreProvider + Shell, recibe initial data del server
- `store.tsx` — context store wired a API (CRUD tx/categorías, filtro período, cache por año, theme/dashStyle/accent)
- `Shell.tsx` — layout responsive (Sidebar desktop / BottomNav móvil), nav, ThemeToggle
- `Icon.tsx` — `Icon` (Lucide vía registry) + `CatBubble`
- `Donut.tsx` — donut SVG segmentado
- `ui.tsx` — PeriodPills, MonthNav/Tabs, CenterBalance, ActionButton, Segmented, StateView
- `screen-{dashboard,movimientos,calendario,categorias,ajustes}.tsx`
- `modal-new-entry.tsx` (calc), `modal-icon-store.tsx` (Tienda)
- `lib/icon-registry.ts`, `lib/icon-catalog.ts`, `lib/format.ts`
- `lib/notion/client.ts` — `queryDatabase()` helper REST

## Vercel deployment — caveats

- Alias real de producción: **una-monedita-three.vercel.app** (NO `una-monedita.vercel.app` — ese es un proyecto viejo/duplicado en otra cuenta, ignorar).
- Para set/re-set env en Vercel: `echo 'valor' | npx vercel env add NAME production`. Usar `echo` (con newline). `printf '%s'` sin newline deja la var vacía.
- `vercel env pull` siempre devuelve `""` para vars custom (son Sensitive) — no sirve para verificar valores. Verificar via runtime/logs de Vercel.
- Env vars solo aplican a deploys **nuevos**. Tras cambiar vars, siempre hacer `npx vercel --prod --yes`.
- `una-monedita.vercel.app` apunta a build antiguo (sin GET `/api/transactions`, codebase vieja). No lo tocar.

## Reglas de desarrollo

1. **Avisar ANTES de instalar paquetes nuevos o cambios estructurales grandes**
2. Nunca commitear `.env.local`
3. Moneda: ARS (multi-moneda fuera de alcance)
4. Para añadir una transacción desde código: POST `/api/transactions`
5. El dashboard revalida con `router.refresh()` tras guardar — es server component
6. `lib/notion/transactions.ts` exporta `getTransactions`, `createTransaction`, `updateTransaction`, `deleteTransaction`
