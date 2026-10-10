# UnaMonedita

App de finanzas personales conectada a Notion. Registrás gastos e ingresos en menos de 10 segundos desde el celular, ves cuánta plata tenés hoy y analizás el período en desktop. Tus datos viven en TU Notion: la app no tiene base de datos propia.

**Producción:** https://una-monedita-three.vercel.app

> Este README describe cómo está compuesta la app y qué hace. Se actualiza en el mismo commit que cualquier cambio de funcionalidad o estructura (regla 7 de `CLAUDE.md`).

---

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript, pnpm
- **Tailwind v4** con tokens CSS propios (`app/globals.css`); casi todo el estilo es inline sobre esos tokens
- **Fuentes:** Nunito (UI), Fraunces (números), Geist Mono
- **lucide-react**: iconos, registro explícito de ~180 en `lib/icon-registry.ts`
- **@notionhq/client v5** + helpers REST (`lib/notion/client.ts`): Notion como base de datos, solo del lado del servidor
- **jose**: cookie cifrada (JWE) con la conexión a Notion
- **zod v4**: validación de pedidos
- **Vercel**: deploy por CLI

---

## Cómo se entra (sin contraseña)

La app **no tiene usuario ni contraseña**. Conectar tu Notion es el ingreso:

1. Duplicás la plantilla de Notion a tu cuenta (6 bases de datos).
2. Creás una integración en [notion.so/my-integrations](https://www.notion.so/my-integrations) y la compartís con tu página (menú ⋯ → Conexiones).
3. Abrís la app: sin conexión te lleva a **`/setup`**. Pegás el **token** de la integración y la **URL** de tu página, y tocás **Conectar**. La app encuentra las 6 bases sola.

Qué pasa después:

- La conexión queda en **una cookie cifrada de ese dispositivo** (`__Host-um_notion` en producción, `um_notion` en desarrollo). El servidor no guarda nada.
- **Recordar en este dispositivo** (marcado por defecto): la cookie dura 400 días. Sin recordar, se borra al cerrar el navegador (y vence a las 24 h). En la app instalada siempre recuerda.
- El gestor de contraseñas (llavero de iCloud, Chrome) ofrece guardar el token y la URL para completarlos en otro dispositivo.
- **iPhone:** la app instalada en la pantalla de inicio tiene sus propias cookies, separadas de Safari. Conectala una vez dentro de la app instalada.
- **Ajustes → Notion:** muestra el estado, **Cambiar de cuenta de Notion** (vuelve a `/setup`) y **Desconectar Notion** (borra la cookie de este dispositivo y te lleva a `/setup`). Tus datos quedan en Notion.
- Si el token deja de servir (lo regeneraste, o quitaste la integración de la página), la app te lleva a `/setup` con el aviso correspondiente.

Los dispositivos que estaban conectados con la versión anterior (con contraseña) se migran solos a la cookie nueva.

## Compartir la app

Cada persona usa **su propia cuenta de Notion**: no hay datos compartidos entre usuarios.

- **Recomendado:** cada persona hace su propio deploy desde el repo (ver `DEPLOY.md`). Así el servidor es suyo.
- Una misma instalación puede servir a varias personas: cada navegador trae su cookie y ve solo su Notion. Pero el servidor usa tu token para leer tu Notion, así que conectá solo en una instalación tuya o de alguien de confianza.
- Si se pierde un dispositivo: en notion.so/my-integrations regenerá el token de la integración y volvé a conectar. Desconectar solo borra la cookie de ese dispositivo; el token sigue siendo válido en Notion hasta que lo regeneres.

---

## Pantallas y funcionalidades

SPA estilo Monefy con navegación interna (sin cambio de ruta). Móvil: barra inferior con 5 pestañas. Desktop (>760px): sidebar con las 6 pantallas y los botones **Agregar gasto / ingreso** (atajos `g` / `i`).

| Pantalla | Qué hace |
|----------|----------|
| **Resumen** | **Disponible hoy**, tira Ingresos / Gastos / Balance del período, donut por categoría, leyenda con presupuestos, comparativa y promedio |
| **Movimientos** | Lista agrupada por día, edición y borrado, filtro por tipo y categorías |
| **Calendario** | Grilla mensual con totales por día, detalle del día, balance del mes y saldo al cierre |
| **Fijos** | Gastos e ingresos recurrentes, con ✓ para registrar cada pago y contador mensual |
| **Categorías** | CRUD, tienda de iconos y colores, presupuesto mensual por categoría de gasto |
| **Ajustes** | Moneda, saldo, tema, color, estilo del resumen, Notion y mantenimiento |

### Resumen

- **Disponible hoy** (barra inferior en el móvil, tarjeta en desktop): toda tu plata, acumulada. Es el saldo inicial más todo lo registrado hasta hoy. **No depende del período que estés mirando** ni cambia al pasar de mes: tenés 1000, gastás 100 → 900, cobrás 400 → 1300, cambia el mes → sigue 1300. Tocarlo abre **Tu saldo** (cuenta del período y desglose por día / semana / mes).
- **Tira del período:** Ingresos, Gastos y Balance (ingresos − gastos) del día, semana, mes, año o rango personalizado. Ingresos y Gastos son también el selector de lo que muestra el donut.
- **Donut:** gastos o ingresos por categoría. La cifra del centro se ajusta al hueco del anillo (montos de 4+ cifras no se montan sobre el aro). Tres estilos de lista en el móvil: Anillo, Leyenda, Grilla.
- **Presupuestos:** si el rango es un mes completo, cada categoría de gasto con presupuesto muestra gasto vs límite (ámbar al 80%, rojo al superarlo).
- Navegación `‹ ›` por período; tocar la etiqueta abre el selector de rango.

### Fijos

Lista de gastos e ingresos fijos (alquiler, suscripciones, sueldo). Cada fila dice, **para el mes en curso**: "Vence 26 oct", "Pendiente · vence hoy", "Pendiente · venció 26 sep" o "Pagado 28 sep". El **✓** abre el mismo modal de "Agregar gasto", precargado, y al confirmar crea el movimiento y avanza el próximo vencimiento. El contador **N/M pagados** se calcula contra el mes calendario: al cambiar de mes vuelve a 0 solo (los fijos que no le tocan al mes, como un anual, no cuentan).

### Ajustes

- **Moneda** para nuevos movimientos (€ / $ / US$).
- **Saldo: "¿Cuánta plata tenés hoy? (efectivo + banco)".** Escribís lo que tenés y la app calcula el saldo inicial para que el Disponible de hoy sea exactamente eso. Desde ahí cada gasto resta y cada ingreso suma.
- **Tema:** automático, claro u oscuro. **Color:** Verde, Turquesa o **Grafito** (escala de grises; ingresos en verde, gastos en rojo y categorías conservan su color).
- **Estilo del resumen** en el móvil.
- **Notion:** estado, cambiar de cuenta, desconectar.
- **Mantenimiento:** *Preparar Notion* (agrega a Subscriptions las propiedades que falten) y *Publicar guía para agentes* (publica `docs/NOTION-SCHEMA.md` en tu Notion).

---

## Cómo se calcula el saldo

Glosario (se usa tal cual en la UI):

| Término | Qué es |
|---------|--------|
| **Disponible hoy** | Saldo inicial + ingresos − gastos de todo lo fechado hasta hoy. Es el número grande de la app |
| **Balance diario / semanal / mensual / anual / del período** | Ingresos − gastos del rango que estás mirando |
| **Saldo al inicio** | Saldo inicial + todo lo anterior al comienzo del rango |
| **Saldo hoy / Saldo al 30 sep / Saldo previsto** | Saldo al inicio + balance del período, contado hasta hoy (rango que contiene hoy), hasta el fin del rango (ya pasó) o hasta su fin (futuro). Solo en la hoja Tu saldo |

Reglas:

- El **saldo inicial** vive en `Accounts.InitialBalance` (cuenta "Principal") y se calcula desde "¿Cuánta plata tenés hoy?". **Puede ser negativo** (si ya registraste más movimientos de los que explica tu plata actual).
- Los movimientos con fecha futura no cuentan hasta que llega el día (se avisa cuántos hay).
- Las transferencias no son ingreso ni gasto: se ignoran.
- La app no convierte monedas: el saldo suma todo sin conversión (la hoja Tu saldo avisa si se mezclan).
- Los movimientos sin fecha no entran en ningún total.

---

## Seguridad

- **Una sola credencial:** la cookie cifrada (JWE `dir`/`A256GCM`, clave derivada de `AUTH_COOKIE_SECRET`) con el token y los IDs de las bases. `httpOnly`, `SameSite=Lax`, `Secure` y prefijo `__Host-` en producción.
- **Sin cookie válida solo se ve `/setup`:** páginas redirigen a `/setup`, la API responde `401 { code: "notion_disconnected" }`.
- **CSRF:** como `/setup` es público, el proxy corta antes de cualquier ruta (`lib/auth/csrf.ts`): a `/api/*` no se llega navegando desde otro sitio, las escrituras exigen mismo origen (`Origin` / `Sec-Fetch-Site`) y el cuerpo debe ser `application/json` (un formulario ajeno no puede enviarlo). Evita que otro sitio conecte tu navegador al Notion de un atacante.
- **Límite de intentos** en `/api/setup` (10 cada 15 minutos por IP).
- **Sin respaldo de servidor:** `lib/notion/*` exige las credenciales de cada pedido; nunca cae a variables de entorno. Las `NOTION_*` y `DEV_AUTH_BYPASS` son solo para desarrollo en `localhost` (el bypass exige `NODE_ENV=development`, `DEV_AUTH_BYPASS=1` y un host local, así que no sirve desde la red local ni con DNS rebinding). **Nunca** definirlas en Vercel.
- **Rotar `AUTH_COOKIE_SECRET`** desconecta a todos los dispositivos.
- **`POST /api/seed?reset=1`** archiva todas las categorías: es POST con JSON y mismo origen, no un link.

---

## Bases de datos Notion

| Base | Qué usa la app |
|------|----------------|
| Transactions | Gastos e ingresos (monto, moneda, fecha, categoría, nota, fijo que lo originó) |
| Accounts | Solo `InitialBalance` de la cuenta "Principal" (o la primera no archivada) |
| Categories | Nombre, tipo (Gasto/Ingreso), icono Lucide y color hex |
| Subscriptions | Los gastos e ingresos fijos (frecuencia, día del mes, próximo vencimiento, último pago, estado) |
| Budgets | Presupuesto mensual por categoría (límite, aviso al 80%) |
| FX Rates | Está en la plantilla pero la app no la usa |

Esquema completo en [`docs/NOTION-SCHEMA.md`](docs/NOTION-SCHEMA.md) (también se publica dentro de Notion desde Ajustes → Mantenimiento).

> **@notionhq/client v5:** `databases.query` se eliminó. Usar siempre `queryDatabase()` de `lib/notion/client.ts` (REST directo). Con el plan gratis de Notion, si el workspace agota sus bloques, crear páginas devuelve `403 restricted_resource` (la app lo avisa); se arregla en Notion.

---

## API

Todas las rutas (salvo `/api/setup`) requieren la cookie de conexión. Los fallos de Notion responden `502 { error, code, message }`; un token rechazado, `401 { code: "notion_token_invalid" }`.

| Ruta | Método | Función |
|------|--------|---------|
| `/api/setup` | POST | Conecta Notion (`notionToken`, `pageUrl`, `remember`): valida el token, encuentra las 6 bases y guarda la cookie. Pública, con límite de intentos |
| `/api/setup` | DELETE | Desconecta este dispositivo (borra la cookie). Idempotente |
| `/api/me` | GET | Estado de la conexión `{ connected, via, remember }`; `?full=1` suma los IDs y la página padre |
| `/api/transactions` | GET / POST | Lista por año (`?year=`) / crea |
| `/api/transactions/[id]` | PATCH / DELETE | Edita / borra |
| `/api/transactions/history` | GET | `?before=YYYY-MM-DD`: todo lo anterior (alimenta el saldo) |
| `/api/accounts/opening` | GET / PUT | Saldo inicial (`Accounts.InitialBalance`) |
| `/api/categories`, `/api/categories/[id]` | GET, POST / PATCH, DELETE | CRUD (DELETE archiva) |
| `/api/subscriptions`, `/api/subscriptions/[id]` | GET, POST / PATCH, DELETE | CRUD de fijos |
| `/api/subscriptions/[id]/pay` | POST | Registra el pago: crea el movimiento y avanza `NextChargeDate`; `409` si ya estaba registrado |
| `/api/subscriptions/migrate` | POST | Agrega a Subscriptions las propiedades que falten |
| `/api/budgets`, `/api/budgets/[id]` | GET, POST / PATCH | Presupuestos mensuales |
| `/api/notion/guide` | POST | Publica la guía de agentes en tu Notion |
| `/api/seed` | POST | Siembra las categorías de diseño si no hay ninguna; `?reset=1` archiva todo y resiembra |

Sembrar categorías desde la consola del navegador, con la app abierta y conectada:

```js
await fetch("/api/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json());
```

---

## Setup local

```bash
pnpm install
cp .env.example .env.local
```

En `.env.local` alcanza con:

```env
AUTH_COOKIE_SECRET=   # mínimo 32 caracteres: openssl rand -base64 32
```

Después `pnpm dev` y abrí http://localhost:3000: te lleva a `/setup` para conectar tu Notion, igual que en producción.

Opcional, **solo en tu máquina**: para saltar `/setup` con tus credenciales (solo funciona abriendo por `localhost`), agregá `DEV_AUTH_BYPASS=1`, `NOTION_TOKEN` y los `NOTION_DB_*` (ver `.env.example`). Esas credenciales leen tus datos reales.

Para probar desde el celular en la misma red, conectá por `/setup` (el bypass no aplica fuera de localhost): `pnpm dev --hostname 0.0.0.0`.

---

## Tests

Funciones puras sin dependencias de pruebas: se compilan con `tsc` a `node_modules/.cache/um-tests` y se corren con `node`.

```bash
npx tsc scripts/test-recurrence.ts scripts/test-balance.ts scripts/test-date-range.ts scripts/test-session.ts scripts/test-csrf.ts --outDir node_modules/.cache/um-tests --module commonjs --moduleResolution node --target es2020 --esModuleInterop --skipLibCheck --strict
node node_modules/.cache/um-tests/scripts/test-recurrence.js
node node_modules/.cache/um-tests/scripts/test-balance.js
node node_modules/.cache/um-tests/scripts/test-date-range.js
node node_modules/.cache/um-tests/scripts/test-session.js
node node_modules/.cache/um-tests/scripts/test-csrf.js
```

Además: `pnpm type-check`, `pnpm lint` y `pnpm build`.

---

## Deploy

Ver [`DEPLOY.md`](DEPLOY.md) para instalar tu propia copia. Para el deploy de este proyecto:

```bash
npx vercel --prod --yes
```

Solo en el team `franco-s-projects02`, proyecto `una-monedita` (ver las reglas de cuenta en `CLAUDE.md`). La única variable obligatoria es `AUTH_COOKIE_SECRET`.

---

## Estructura del proyecto

```
app/
  (app)/dashboard/      # SPA principal (server: carga inicial con la cookie → client)
  setup/                # Conectar Notion: page.tsx (servidor) + setup-form.tsx (cliente)
  api/                  # setup, me, transactions, accounts, categories, subscriptions,
                        # budgets, notion/guide, seed
  globals.css           # Design system: tokens CSS, temas, acentos (verde/teal/grafito)
  layout.tsx            # Fuentes, metadata, script de tema antes del primer paint
  manifest.ts           # PWA manifest

components/app/
  AppRoot.tsx           # StoreProvider + Shell
  store.tsx             # Estado global: movimientos por año, Disponible, rango, fijos,
                        # presupuestos, preferencias; apiFetch (401 → /setup)
  Shell.tsx             # Layout responsivo (sidebar / barra inferior)
  screen-dashboard.tsx  # Resumen   screen-movimientos.tsx   screen-calendario.tsx
  screen-recurrentes.tsx  # Fijos   screen-categorias.tsx    screen-ajustes.tsx
  balance.tsx           # PeriodSummary, Monedero, BalanceCard, hoja "Tu saldo"
  ui.tsx                # SegmentedControl, RangeNav, CenterBalance, Toast, StateView
  Donut.tsx  Coin.tsx  Icon.tsx  Sheet.tsx  useElementSize.ts
  modal-*.tsx           # nuevo movimiento, tienda de iconos, fijo, rango, filtros

lib/
  auth/                 # session.ts (cookie cifrada), csrf.ts, rate-limit.ts
  notion/               # client.ts + una librería por base + schemas, errores, payments
  balance.ts            # Disponible hoy y saldo del período (funciones puras)
  recurrence.ts         # Fechas de fijos, estado y contador mensual
  date-range.ts         # Motor de rangos (día/semana/mes/año/personalizado)
  format.ts             # Moneda, fechas, ajuste de fuente
  icon-registry.ts  icon-catalog.ts  tx-filter.ts  utils.ts

proxy.ts                # Acceso: secreto, CSRF, rutas públicas, cookie, migración
scripts/                # test-*.ts (puros), publish-notion-guide.ts, gen-icons.mjs
docs/NOTION-SCHEMA.md   # Esquema de las 6 bases para agentes
```

---

## Categorías por defecto (seed)

**Gastos:** Comida, Supermercado, Transporte, Casa, Servicios, Ropa, Ocio, Salud, Café, Mascotas, Educación, Regalos, Deporte, Farmacia, Viajes, Combustible, Suscripciones, Restaurant

**Ingresos:** Salario, Changas, Ahorros, Freelance, Inversiones, Venta
