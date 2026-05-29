# Una Monedita — CLAUDE.md

App de finanzas personales de Franco Recabarren. Registra gastos e ingresos en Notion desde el celular en <10s, analiza reportes en desktop.

**URL producción:** https://una-monedita.vercel.app  
**Dev local:** `pnpm dev` → http://localhost:3000 (o 3001 si 3000 ocupado)  
**Red local:** http://100.66.44.7:3001

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind v4, pnpm
- Notion como base de datos (workspace "Notion de Franco Recabarren")
- Integración Notion: "UNA MONEDITA"
- jose (JWT auth), zod v4, framer-motion 12, react-hook-form 7
- @phosphor-icons/react v2 (iconos — NUNCA Lucide)
- Vercel deployment (cuenta listi-testing26)

## Design system: minimalist-ui

Reglas estrictas — NO violar:
- Canvas `#FBFBFA`, Surface `#FFFFFF`, Border `#EAEAEA`
- Ink `#111111`, Muted `#787774`
- Gastos: `#9F2F2D` / `#FDEBEC`; Ingresos: `#346538` / `#EDF3EC`
- CTA primario: `bg-[#111111] text-white rounded-[6px]`
- Cards: `border border-[#EAEAEA] rounded-[8px]`
- **NO** `rounded-full` en contenedores/botones grandes
- **NO** Lucide icons — usar Phosphor (Bold/Fill)
- **NO** emojis en markup
- **NO** `shadow-md/lg/xl`
- Iconos server components: `import { X } from "@phosphor-icons/react/dist/ssr"`
- Iconos client components: `import { X } from "@phosphor-icons/react"`

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

| Ruta | Estado |
|------|--------|
| `/dashboard` | ✅ Funcional — resumen mes, recientes |
| `/transacciones` | ✅ Funcional — lista real agrupada por fecha, edición inline |
| `/cuentas` | Stub "Próximamente" |
| `/presupuestos` | Stub "Próximamente" |
| `/suscripciones` | Stub "Próximamente" |
| `/reportes` | Stub "Próximamente" |
| `/ajustes` | Stub "Próximamente" |

## API Routes

| Ruta | Método | Función |
|------|--------|---------|
| `/api/auth` | POST | Login → setea cookie JWT |
| `/api/auth` | DELETE | Logout → borra cookie |
| `/api/seed` | GET | Seedea 14 categorías default si DB vacía |
| `/api/transactions` | POST | Crea transacción |
| `/api/transactions/[id]` | PATCH | Edita transacción |
| `/api/transactions/[id]` | DELETE | Borra transacción (`in_trash`) |
| `/api/categories` | GET | Lista categorías (`?kind=Gasto\|Ingreso`) |

## Categorías

**Gasto:** Comida, Transporte, Entretenimiento, Salud, Ropa, Servicios, Casa, Otros  
**Ingreso:** Sueldo, Freelance, Inversiones, Regalo, Reembolso, Otros

## Componentes clave

- `components/shell/AppShell.tsx` — layout adaptativo desktop/mobile
- `components/shell/TransactionSheetProvider.tsx` — context para `openAdd()` / `openEdit(tx)`
- `components/shell/Sidebar.tsx` — nav desktop
- `components/shell/BottomNav.tsx` — nav mobile + FAB
- `components/transaction/AddTransactionSheet.tsx` — sheet alta/edición (prop `transaction` opcional)
- `components/transaction/TransactionList.tsx` — lista con click → openEdit
- `lib/category-icons.tsx` — map nombre categoría → Phosphor icon (NO emojis)
- `lib/notion/client.ts` — `queryDatabase()` helper REST

## Reglas de desarrollo

1. **Avisar ANTES de instalar paquetes nuevos o cambios estructurales grandes**
2. Nunca commitear `.env.local`
3. Moneda: ARS (multi-moneda fuera de alcance)
4. Para añadir una transacción desde código: POST `/api/transactions`
5. El dashboard revalida con `router.refresh()` tras guardar — es server component
6. `lib/notion/transactions.ts` exporta `getTransactions`, `createTransaction`, `updateTransaction`, `deleteTransaction`
