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
NOTION_PARENT_PAGE_ID=36d5c48e-39b6-8096-ada7-ddbef6dbefa8
NOTION_DB_TRANSACTIONS=36d5c48e-39b6-8172-ba4b-c2c59fa3fe6f
NOTION_DB_ACCOUNTS=36d5c48e-39b6-812a-864a-df660a69585e
NOTION_DB_CATEGORIES=36d5c48e-39b6-8193-b122-ce5da3528802
NOTION_DB_SUBSCRIPTIONS=36d5c48e-39b6-81fd-b57c-c1d4033101e1
NOTION_DB_BUDGETS=36d5c48e-39b6-81b5-be41-ed826914438b
NOTION_DB_FX_RATES=36d5c48e-39b6-8195-b489-d81b1bd2b9c8
```

`NOTION_TOKEN` NO va acá en texto plano — vive solo en `.env.local` / env vars de
Vercel. Esquema completo de las 6 bases (props, tipos, valores válidos, ejemplos
de payload) documentado para agentes en [docs/NOTION-SCHEMA.md](docs/NOTION-SCHEMA.md)
y espejado como página "📖 Guía del sistema (para agentes)" dentro de la página
principal de Notion (publicada por `scripts/publish-notion-guide.ts`).

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
| Fijos / recurrentes (Por pagar / Próximos / Pausados) | ✅ |
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
| `/api/subscriptions` | GET/POST | Lista recurrentes (`?status=`) / crea |
| `/api/subscriptions/[id]` | PATCH/DELETE | Edita / borra (`in_trash`) |
| `/api/subscriptions/[id]/pay` | POST | Cobra ahora: crea Transaction + avanza NextChargeDate |
| `/api/subscriptions/migrate` | POST | Agrega a la DB Subscriptions las props que falten (idempotente) |
| `/api/cron/subscriptions` | GET | Cron diario (`CRON_SECRET`): cobra los `AutoCreate=true` vencidos |
| `/api/budgets` | GET | Lista presupuestos del mes (`?year=YYYY&month=1-12`) |
| `/api/budgets` | POST | Crea presupuesto (name, limit, currency, month, categoryId?) |
| `/api/budgets/[id]` | PATCH | Edita límite / recurring / alertAt80 |
| `/api/notion/guide` | POST | Publica `docs/NOTION-SCHEMA.md` como subpágina "📖 Guía del sistema" en Notion (creds de sesión) |
| `/api/me` | GET | Estado de config Notion; `?full=1` además resuelve los 6 DB IDs + página padre |

## Gastos/ingresos fijos (recurrentes)

- DB Notion: `Subscriptions` (reusada, no es una hoja nueva). Frecuencias:
  Diaria/Semanal/Mensual/Bimestral/Trimestral/Semestral/Anual/Personalizada.
  Esquema completo → [docs/NOTION-SCHEMA.md](docs/NOTION-SCHEMA.md#subscriptions-gastosingresos-recurrentes--fijos-en-la-app).
- `DueDay` (1–31): día objetivo del mes; si no existe en el mes (31 en
  febrero) se clampea al último día — nunca salta de mes. Lógica en
  `lib/recurrence.ts`.
- `AutoCreate` por ítem: `true` = el cron cobra solo; `false` = queda en "Por
  pagar" hasta que el usuario toca Pagar. Cobro compartido (botón manual y
  cron) en `lib/notion/payments.ts` `chargeSubscription()`.
- Antes de usar la feature en una base existente: Ajustes → Mantenimiento →
  **Preparar Notion** (llama `POST /api/subscriptions/migrate`, agrega
  `Type`/`DueDay`/`AutoCreate`/`LastChargedDate`/`EndDate` a la DB
  Subscriptions si faltan; idempotente).
- La guía para agentes (Hermes) se publica/actualiza desde Ajustes →
  Mantenimiento → **Publicar guía para agentes** (`POST /api/notion/guide`,
  usa las creds de la sesión logueada — no requiere `NOTION_TOKEN` local).
  Fuente: [docs/NOTION-SCHEMA.md](docs/NOTION-SCHEMA.md).

## Resumen por rango de fechas

- Un único modelo de rango (`lib/date-range.ts`, puro) alimenta el Resumen:
  `Período` = Día/Semana/Mes/Año/Personalizado. `store.tsx` deriva `range`
  (`{start,end}`) del `anchor` + período elegido; `Personalizado` usa
  `customRange` (elegido a mano o vía atajos en `modal-range.tsx`).
- `PeriodPills` (pastillas) + `RangeNav` (`‹ etiqueta ›`, tocar abre el
  selector) en `ui.tsx`. `navRange(delta)` mueve el rango completo (para
  Personalizado, por el propio largo del rango). `month`/`year`/`navMonth` se
  mantienen aparte para el Calendario (comparten el mismo `anchor`).
- `visibleTx`/`totals` ya filtran por `range` en vez de mes fijo — cubre
  rangos que cruzan de año (`yearsIn(range)` dispara el fetch de cada año que
  falte). `prevRange`/`prevTotals` = mismo largo, tramo anterior — alimentan
  la comparativa (`ComparativeStats`) y el mini-gráfico de tendencia
  (`TrendBars.tsx`, baldes vía `bucketsFor(range)`).

## Presupuestos por categoría

- DB Notion: `Budgets` (`lib/notion/budgets.ts` — `getBudgetsByMonth`,
  `createBudget`, `updateBudget`, todas con `creds?: NotionCreds` como las
  demás). Son **mensuales**: un presupuesto por categoría y mes (`Month` =
  primer día del mes).
- Se editan desde Categorías (campo "Presupuesto mensual" al editar una
  categoría de Gasto) → `store.setBudget(categoryId, limit)` hace upsert
  (PATCH si ya existe uno para el mes del `anchor`, POST si no).
- En el Resumen, `LegendList` solo cruza gasto real vs límite cuando el rango
  visible es un mes completo (`isFullMonthRange`); en Día/Semana/Año/rangos
  parciales vuelve a mostrar el % relativo normal. Ámbar al 80% (si
  `AlertAt80`), rojo al superar el límite.

## Categorías (set Monefy actual)

**Gasto:** Comida·Utensils, Supermercado·ShoppingCart, Transporte·Car, Casa·House, Servicios·Plug, Ropa·Shirt, Ocio·Gamepad2, Salud·HeartPulse, Café·Coffee, Mascotas·PawPrint, Educación·GraduationCap, Regalos·Gift  
**Ingreso:** Salario·Wallet, Changas·Briefcase, Ahorros·PiggyBank  
(cada una con color hex — ver `app/api/seed/route.ts`)

## Componentes clave (`components/app/`)

- `AppRoot.tsx` — StoreProvider + Shell, recibe initial data del server
- `store.tsx` — context store wired a API (CRUD tx/categorías/fijos/presupuestos, rango de fechas, cache por año, theme/dashStyle/accent)
- `Shell.tsx` — layout responsive (Sidebar desktop / BottomNav móvil), nav, ThemeToggle
- `Icon.tsx` — `Icon` (Lucide vía registry) + `CatBubble`
- `Donut.tsx` — donut SVG segmentado; `TrendBars.tsx` — mini-gráfico de barras (mismo enfoque casero, sin libs)
- `ui.tsx` — PeriodPills, MonthNav (Calendario) / RangeNav (Resumen), CenterBalance, ActionButton, Segmented, StateView
- `screen-{dashboard,movimientos,calendario,categorias,recurrentes,ajustes}.tsx`
- `modal-new-entry.tsx` (calc), `modal-icon-store.tsx` (Tienda), `modal-recurrente.tsx` (fijos), `modal-range.tsx` (selector de rango del Resumen)
- `lib/icon-registry.ts`, `lib/icon-catalog.ts`, `lib/format.ts`
- `lib/date-range.ts` — motor puro de rangos de fechas (Día/Semana/Mes/Año/Personalizado) para el Resumen
- `lib/notion/client.ts` — `queryDatabase()` helper REST
- `lib/notion/markdown-blocks.ts` — markdown → bloques Notion + publish helpers, usado por `scripts/publish-notion-guide.ts` y `/api/notion/guide`
- `lib/recurrence.ts` — motor de recurrencia de gastos/ingresos fijos
- `lib/notion/budgets.ts` — CRUD de presupuestos mensuales por categoría

## Vercel deployment — caveats

### CUENTA DE DESPLIEGUE — regla dura

Esta app se despliega **SOLO** en la cuenta Vercel del dueño:

- **Panel:** https://vercel.com/franco-s-projects02
- **Team:** `franco-s-projects02` (`orgId: team_toBMZPWU7E3BymiNs85vb7l4`)
- **Proyecto:** `una-monedita` (`projectId: prj_KtMp6hZWEoPSIcVIKI1kiEZuIEsz`)
- **Usuario:** `francorecabarren-8052`

**Nunca** desplegar en otra cuenta, team o scope, ni siquiera si hay otra sesión
de Vercel activa de otro proyecto en esta máquina. Antes de cualquier deploy,
verificar el scope activo con `npx vercel whoami` y confirmar que
`.vercel/project.json` tiene el `orgId` y `projectId` de arriba. Si no coinciden,
**parar y preguntar** — no relinkear ni crear un proyecto nuevo por tu cuenta.

Mismo criterio para GitHub: el repo es `fdrecabarren/una-monedita`. En esta
máquina hay varias cuentas en `gh` y la activa suele ser otra
(`adamantiumagency-bit`), lo que hace fallar el push con 403. Cambiar con
`gh auth switch --user fdrecabarren`.

### Otros caveats

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
