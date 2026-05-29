# 🪙 Una Monedita

App personal de finanzas conectada a Notion. Mobile-first, adaptive desktop.

---

## Setup rápido

### 1. Clonar y instalar

```bash
git clone <repo-url>
cd una-monedita
pnpm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local` con tus valores.

### 3. Crear integration en Notion

1. Ir a [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **+ New integration**
3. Nombre: `una-monedita`
4. Permisos: `Read content`, `Update content`, `Insert content`
5. Copiar **Internal Integration Token** → `NOTION_TOKEN` en `.env.local`

### 4. Crear página padre en Notion

1. Crear una página en blanco en Notion llamada `Una Monedita`
2. Conectar la integration a esa página: click `•••` → **Connections** → buscar `una-monedita`
3. Copiar el ID de la página de la URL (la parte larga después del último `/`) → `NOTION_PARENT_PAGE_ID`

### 5. Generar secretos

```bash
# AUTH_COOKIE_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Pegar los valores en `.env.local`.

### 6. Crear las bases de datos en Notion

```bash
pnpm seed:notion
```

Este script crea las 6 bases de datos y actualiza automáticamente `.env.local` con los IDs.

### 7. Correr en local

```bash
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000). Ingresar con `APP_PASSWORD`.

**Probar en mobile (mismo WiFi):**

```bash
pnpm dev --hostname 0.0.0.0
```

Abrir `http://<tu-ip-local>:3000` desde el celular.

---

## Deploy en Vercel

```bash
vercel --prod
```

Agregar todas las variables de `.env.example` en el dashboard de Vercel → Settings → Environment Variables.

El cron de suscripciones (9am UTC diario) se activa automáticamente en Vercel vía `vercel.json`.

---

## Bases de datos Notion

| Base | Propósito |
|------|-----------|
| `Transactions` | Ingresos, gastos y transferencias |
| `Accounts` | Cuentas bancarias, efectivo, cripto |
| `Categories` | Categorías con icono y color |
| `Subscriptions` | Suscripciones recurrentes |
| `Budgets` | Presupuestos mensuales por categoría |
| `FxRates` | Cache de cotizaciones de monedas |

---

## Stack

- **Next.js 16** (App Router + Server Actions)
- **Tailwind CSS v4** (mobile-first)
- **shadcn/ui** (Sheet mobile / Dialog desktop)
- **Framer Motion** (animaciones)
- **Recharts** (gráficos)
- **@notionhq/client** (Notion API, server-side)
- **jose** (JWT firmado para auth cookie)
- **Zod** (validación de esquemas)

---

## Roadmap de fases

- [x] Fase 1: Bootstrap + Auth
- [ ] Fase 2: Seed Notion + cliente tipado
- [ ] Fase 3: Shell adaptativo + Add Transaction (mock)
- [ ] Fase 4: Conectar a Notion
- [ ] Fase 5: Dashboard real
- [ ] Fase 6: Lista de transacciones
- [ ] Fase 7: Cuentas + multi-moneda
- [ ] Fase 8: Suscripciones
- [ ] Fase 9: Presupuestos
- [ ] Fase 10: Reportes
- [ ] Fase 11: Pulido + Deploy Vercel
