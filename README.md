# UnaMonedita

App personal de finanzas conectada a Notion. Registra gastos e ingresos en menos de 10 segundos desde el celular, analiza reportes en desktop.

**Produccion:** https://una-monedita-three.vercel.app

---

## Stack

- **Next.js 16** — App Router, Turbopack, TypeScript
- **Tailwind v4** — diseño propio (sin componentes externos)
- **Fonts:** Nunito (UI), Fraunces (numeros display), Geist Mono
- **Lucide React** — iconos (~180 registrados en `lib/icon-registry.ts`)
- **@notionhq/client v5** — Notion como base de datos (server-side)
- **jose** — JWT auth firmado en cookie `um_session`
- **Zod v4** — validacion de esquemas
- **Vercel** — deployment via CLI

---

## Diseño

SPA estilo Monefy: 5 pantallas con navegacion interna (sin cambio de ruta).

| Pantalla | Descripcion |
|----------|-------------|
| Resumen | Donut de gastos/ingresos, balance del periodo, accesos rapidos |
| Movimientos | Lista agrupada por dia, edicion inline, filtro por periodo |
| Calendario | Grilla mensual con totales por dia, detalle al tocar |
| Categorias | CRUD completo + tienda de iconos Lucide con colores |
| Ajustes | Tema claro/oscuro, acento de color (verde/teal/bosque), logout |

**Paleta:** warm cream `#f4f3ee` + verde `#2fa86a`. Tema claro/oscuro via `[data-theme]`. Acento via `[data-accent]`. Variables CSS en `app/globals.css`.

**Layout responsivo:** BottomNav en mobile, sidebar fijo en desktop (>760px).

---

## Auth

Login con password unica (`APP_PASSWORD` env var). JWT firmado en cookie `um_session` (sin expiracion). Para cambiar la sesion: logout + login con nueva password.

Proxy de auth en `proxy.ts` (Next.js 16 — exportado como `proxy`, no `middleware`). Assets estaticos (PNG, SVG, webmanifest) son publicos sin auth.

---

## Bases de datos Notion

| Base | Proposito |
|------|-----------|
| Transactions | Gastos e ingresos |
| Accounts | Cuentas (no implementado en UI aun) |
| Categories | Categorias con icono Lucide y color hex |
| Subscriptions | Suscripciones (no implementado en UI aun) |
| Budgets | Presupuestos (no implementado en UI aun) |
| FxRates | Cache de cotizaciones (no implementado en UI aun) |

> **Caveat @notionhq/client v5:** `databases.query` fue removido. Usar siempre `queryDatabase()` de `lib/notion/client.ts` que llama REST directo.

---

## Setup local

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completar en `.env.local`:

```env
AUTH_COOKIE_SECRET=   # string aleatorio largo (node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
APP_PASSWORD=         # contrasena de login
NOTION_TOKEN=         # internal integration token de Notion
NOTION_PARENT_PAGE_ID=
NOTION_DB_TRANSACTIONS=
NOTION_DB_ACCOUNTS=
NOTION_DB_CATEGORIES=
NOTION_DB_SUBSCRIPTIONS=
NOTION_DB_BUDGETS=
NOTION_DB_FX_RATES=
```

### 3. Notion

1. Ir a [notion.so/my-integrations](https://www.notion.so/my-integrations) → crear integration `UNA MONEDITA`
2. Permisos: Read, Insert, Update content
3. Copiar el token → `NOTION_TOKEN`
4. Crear una pagina raiz en Notion y conectar la integration (menu `···` → Connections)
5. Copiar el ID de esa pagina → `NOTION_PARENT_PAGE_ID`
6. Crear las 6 bases de datos manualmente o duplicar desde una plantilla, conectar la integration a cada una, y copiar los IDs

### 4. Seed de categorias

Con el servidor corriendo o desde produccion:

```
GET /api/seed          # puebla categorias si la base esta vacia
GET /api/seed?reset=1  # archiva todo y reseedea (util para resetear)
```

### 5. Correr en local

```bash
pnpm dev
# → http://localhost:3000
# En mobile (mismo WiFi): pnpm dev --hostname 0.0.0.0
```

---

## Deploy

Deploy directo por CLI (sin CI/CD):

```bash
npx vercel --prod --yes
```

Para actualizar variables de entorno en Vercel:

```bash
echo 'valor' | npx vercel env add NOMBRE production
npx vercel --prod --yes   # redeploy para que apliquen
```

---

## Estructura del proyecto

```
app/
  (app)/dashboard/     # SPA principal (server fetch inicial → client)
  (auth)/login/        # Login con password
  api/                 # API routes (auth, transactions, categories, seed, me, setup)
  globals.css          # Design system (CSS vars, tokens)
  layout.tsx           # Fonts, metadata, PWA
  manifest.ts          # PWA manifest (Next.js metadata route)
  icon.png             # Favicon (Next.js auto-detecta)
  apple-icon.png       # Apple touch icon (Next.js auto-detecta)

components/app/
  Shell.tsx            # Layout responsivo (sidebar desktop / bottomnav mobile)
  AppRoot.tsx          # Provider + Shell, recibe initial data del server
  store.tsx            # Estado global (transacciones, categorias, tema, pantalla)
  Icon.tsx             # Wrapper Lucide + CatBubble
  Donut.tsx            # Grafico donut SVG
  screen-*.tsx         # Una por pantalla
  modal-new-entry.tsx  # Modal de nueva transaccion (con teclado calculadora)
  modal-icon-store.tsx # Tienda de iconos para categorias

lib/
  notion/              # client.ts, transactions.ts, categories.ts, schemas.ts
  icon-registry.ts     # Registro explicito de ~180 iconos Lucide
  icon-catalog.ts      # Grupos y colores para la tienda
  format.ts            # Formateo de moneda, fechas

proxy.ts               # Auth middleware (Next.js 16: exportar como `proxy`)
public/
  icon-192.png         # PWA manifest icon
  icon-512.png         # PWA manifest icon
  logo.png             # Logo usado en login y sidebar
```

---

## Categorias por defecto (seed)

**Gastos:** Comida, Supermercado, Transporte, Casa, Servicios, Ropa, Ocio, Salud, Cafe, Mascotas, Educacion, Regalos, Deporte, Farmacia, Viajes, Combustible, Suscripciones, Restaurant

**Ingresos:** Salario, Changas, Ahorros, Freelance, Inversiones, Venta
