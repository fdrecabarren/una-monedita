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
- App = SPA client-side estilo Monefy: 4 pantallas (Resumen donut, Movimientos, Calendario, Categorías) + Fijos + Ajustes, navegación interna. Móvil: 5 pestañas (Categorías se abre desde Ajustes → "Categorías y presupuestos"); desktop: sidebar con las 6 y los botones Agregar gasto/ingreso arriba (atajos `g` / `i`).
- Modales: todos usan `components/app/Sheet.tsx` (`role="dialog"`, foco que entra y vuelve, trap de Tab, Escape) + `SheetHeader` + `ConfirmRow` (confirmación destructiva dentro del sheet). Nunca dos sheets apilados.
- Avisos: `Toast` (ui.tsx) dentro del Shell; `notice = { kind: "error" | "success", text }`; los errores no se cierran solos, los éxitos a los 2.5 s.
- Fuentes: **Nunito** (`--font-app`, UI), **Fraunces** variable con ejes SOFT/opsz (`--font-serif`, números display `.num`; `.num-coin` = cifras redondas, solo para el Disponible). Nunca Fraunces por encima de 600.
- **Un color = un significado** (tokens en `app/globals.css`): `--accent*` (botón primario, nav activa, anillo "hoy", foco; cambia con `[data-accent]` verde/teal/bosque), `--income*` (ingresos, fijo), `--expense*` (gastos, fijo), `--warn` (presupuesto al 80%), `--on-accent/--on-income/--on-expense` (texto sobre rellenos). Texto de ingreso/gasto usa `--income`/`--expense` (AA); `--income-fill`/`--expense-fill` son solo rellenos y barras. No usar `#fff` fijo ni `--green`/`--red` (ya no existen).
- Tema: `Theme = "system" | "light" | "dark"` (default `system`). El tema resuelto y el acento viven en `<html data-theme data-accent>`; un script en `app/layout.tsx` los escribe antes del primer paint y el store los mantiene. Los tokens están en `:root` + `[data-theme]` para que resuelvan fuera de `.app-root`.
- Escala: radios `--r-sm/md/lg/xl/pill` (8/12/16/22/999); `.card` / `.card-hero` (única receta de tarjeta, con borde); `.eyebrow`, `.caption`, `.amount`, `.sheet-title`, `.sr-only`; foco visible global (`:focus-visible`), `.field-wrap` para inputs sin borde propio; `prefers-reduced-motion` respetado. Texto mínimo 11px, objetivos táctiles 44px.
- Paleta categorías `--cat-*`; el glifo de `CatBubble` se mezcla con `--text` (`--glyph-mix`) para contraste.
- Iconos: **lucide-react** vía `lib/icon-registry.ts` (registro explícito ~180 nombres, tree-shaken) + `components/app/Icon.tsx`.
- Categorías guardan `Icon` (nombre Lucide PascalCase) + `Color` (hex) en Notion.
- Tienda de Iconos: catálogo en `lib/icon-catalog.ts` (`GROUPS`, `COLORS`, `ALL`).
- Preferencias (theme/dashStyle/accent/currency/focus/period/carry) persisten en localStorage (`um.theme/um.dash/um.accent/um.currency/um.focus/um.period/um.carry`).

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
- **Límite de bloques del plan gratis:** si el workspace agota sus bloques, Notion responde `403 restricted_resource` ("This workspace has used all of its free blocks") a todo `pages.create` (gastos, fijos, categorías) pero las lecturas y los `pages.update` siguen andando. En la app se ve como "Notion no deja crear más…". Se arregla en Notion (revisar el uso del plan del workspace, liberar espacio o mejorar el plan), no con código.

## Auth

- Cookie: `um_session` (JWT firmado con `AUTH_COOKIE_SECRET`)
- Proxy auth: `proxy.ts` en raíz (Next.js 16 usa `proxy.ts`, NO `middleware.ts`)
- La función debe exportarse como `proxy` (no `middleware`)
- Rutas públicas: `/login`, `/api/auth`, `/api/seed`
- `/api/*` sin sesión válida responde `401 {error:"Sesión vencida"}` (JSON, sin redirect); las páginas sí redirigen a `/login`
- Fallos de Notion en las rutas de la API → `502 {error, code, message}` vía `lib/notion/errors.ts` `notionErrorResponse()` (loguea `[op] failed:` en Vercel Logs). Las credenciales de env/sesión se `.trim()`-ean en `lib/auth/session.ts`

## Estructura de páginas

SPA: única ruta visible `/dashboard` renderiza `<AppRoot>` (server fetch inicial → client). Navegación entre pantallas es interna por store (`screen`), NO por rutas. `app/(app)/page.tsx` redirige a `/dashboard`. `/login` aparte.

| Pantalla (interna) | Estado |
|------|--------|
| Resumen (donut A/B/C) | ✅ |
| Movimientos (agrupado + edición) | ✅ |
| Calendario (grilla + detalle día) | ✅ |
| Fijos / recurrentes (lista única compacta + ✓ Registrar pago) | ✅ |
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
| `/api/transactions/history` | GET | `?before=YYYY-MM-DD`: todos los movimientos anteriores (exclusivo), paginado en serie. Alimenta el saldo arrastrado |
| `/api/accounts/opening` | GET/PUT | Saldo inicial = `Accounts.InitialBalance` de la cuenta "Principal" (o la primera no archivada; PUT la crea si no existe) |
| `/api/categories` | GET | Lista (`?kind=Gasto\|Ingreso`) |
| `/api/categories` | POST | Crea categoría (name, kind, icon, color) |
| `/api/categories/[id]` | PATCH/DELETE | Edita / archiva (soft-delete) |
| `/api/subscriptions` | GET/POST | Lista recurrentes (`?status=`) / crea |
| `/api/subscriptions/[id]` | PATCH/DELETE | Edita / borra (`in_trash`) |
| `/api/subscriptions/[id]/pay` | POST | Registrar pago: crea Transaction con la fecha elegida por el usuario (default hoy) y avanza `NextChargeDate` un período; `409` si `expectedNext` no coincide (ya se había registrado) |
| `/api/subscriptions/migrate` | POST | Agrega a la DB Subscriptions las props que falten (idempotente) |
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
- **Sin registro automático ni cron.** Un fijo es una plantilla: solo se
  convierte en Transaction cuando el usuario toca el ✓ "Registrar pago" de su
  fila (el día que paga o le debitan). Ese botón abre el mismo modal calculadora
  de "Agregar gasto" (`components/app/modal-new-entry.tsx`) precargado con
  monto/categoría/nota del fijo; la fecha propuesta es **hoy** y se puede
  cambiar. Al confirmar se crea la Transaction con esa fecha, enlazada por
  `Subscription` (constancia del día de cada pago: se ve en "Pagos registrados"
  del editor) y `LastChargedDate` se actualiza; `NextChargeDate` avanza
  exactamente un período desde el vencimiento cubierto (`lib/recurrence.ts`
  `addInterval`); si hay varios períodos atrasados, cada uno se registra por
  separado. Lógica compartida en `lib/notion/payments.ts` `chargeSubscription()`.
- Pantalla Fijos: una sola lista (activos por vencimiento, pausados al final,
  cancelados ocultos). Cada fila muestra "Pendiente · vence X" (vencido o vence
  hoy), "Pagado <fecha del último pago>" o "Próximo X", y el ✓ Registrar pago.
  Encabezado: estimado mensual + contador "N/M pagados".
- Editor de fijo (`modal-recurrente.tsx`): Tipo, Nombre, Monto, Categoría,
  Frecuencia, Día del mes (o cada N días si Personalizada). Un fijo nuevo arranca
  hoy y su primer vencimiento se deriva del día del mes.
- `AutoCreate`, `AlertDaysBefore` y `Notes` siguen en Notion por compatibilidad
  pero la app ya no los lee/edita (`AlertDaysBefore` se escribe con su default 3
  al crear; `AutoCreate` ya no se escribe).
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

## Saldo acumulado ("dinero en mi poder")

- Glosario (usar tal cual en la UI): **Balance diario/semanal/mensual/anual/del período** = ingresos − gastos del rango. **Saldo anterior** = saldo inicial + todo lo anterior al rango. **Disponible** = saldo anterior + balance del período, contado hasta hoy ("Disponible hoy" si el rango contiene hoy; "Saldo al 30 sep" si ya pasó; "Saldo previsto" si es futuro). Nunca usar "Saldo" y "Balance" para el mismo número.
- Lógica pura en `lib/balance.ts` (`netBetween`, `openingBalance`, `closingCutoff`, `carryFor`, `balanceSeries`) + `balanceLabel`/`bucketsFor(range, unit)` en `lib/date-range.ts`. Tests: `scripts/test-balance.ts` (compilar con `tsc` + node; no hace falta instalar `tsx`).
- Preferencia `carryOver` (`um.carry`, default Acumulado) en Ajustes → "Saldo": **Solo del período** (como antes) o **Acumulado**. Con Acumulado el store pide UNA vez `/api/transactions/history?before=<initialYear>-01-01` y deriva `carry` (`off | loading | error | ready`). Nunca se muestra una suma parcial: mientras faltan años, `loading`.
- Cache por año: `loadedYears` (no `txByYear[y]`: `upsertTx` puede crear un año con solo un movimiento optimista). Al llegar un año se conservan los optimistas `tmp-`. `rangePending` evita el "Sin movimientos" falso mientras carga un año.
- Saldo inicial: `Accounts.InitialBalance` vía `/api/accounts/opening`; en Ajustes se edita a mano o "Calcularlo desde lo que tengo hoy". Las transferencias no cuentan en totales ni saldo. La app no convierte monedas: el saldo suma todo sin conversión (la hoja "Tu saldo" avisa si se mezclan).
- UI en `components/app/balance.tsx`: `Monedero` (barra inferior móvil, siempre visible), `BalanceCard` (hero desktop), `BalanceSheet` ("Tu saldo": ecuación + desglose por día/semana/mes). Firma visual: `Coin.tsx` (la monedita; con brote si el balance del período es positivo) solo junto al Disponible. Calendario: balance mensual, balance del día y saldo al cierre.
- Los movimientos sin `Date` no entran en ningún total (los filtros de fecha de Notion los excluyen).

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
- `store.tsx` — context store wired a API (CRUD tx/categorías/fijos/presupuestos, rango de fechas, cache por año, theme/dashStyle/accent). Los errores de mutación llegan al toast con el motivo real del servidor (`HttpError` / `failureText`); sesión vencida → aviso + redirect a /login
- `Shell.tsx` — layout responsive (Sidebar desktop / BottomNav móvil), nav, ThemeToggle
- `Icon.tsx` — `Icon` (Lucide vía registry) + `CatBubble`
- `Donut.tsx` — donut SVG segmentado; `TrendBars.tsx` — mini-gráfico de barras (mismo enfoque casero, sin libs)
- `ui.tsx` — SegmentedControl (único estilo de selección; PeriodPills, FocusToggle, Segmented), MonthNav (Calendario) / RangeNav (Resumen), CenterBalance (total del foco, sin saldo), ActionButton, Toast, StateView
- `Sheet.tsx` (Sheet, SheetHeader, ConfirmRow), `Coin.tsx`, `balance.tsx` (Monedero, BalanceCard, BalanceSheet)
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
