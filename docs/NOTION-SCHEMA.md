# Esquema de Notion — Una Monedita (guía para agentes)

Este documento describe la base de Notion que usa la app "Una Monedita" (finanzas
personales de Franco Recabarren) para que un agente (ej. Hermes) pueda leerla y
operarla directamente por API sin tener que inferir la estructura.

Copia canónica: esta misma guía vive también como página hija de Notion
"📖 Guía del sistema (para agentes)", dentro de la página principal "Una
Monedita". Se republica desde la app: Ajustes → Mantenimiento → "Publicar
guía para agentes" (usa las credenciales de la sesión logueada). También se
puede publicar por línea de comandos con
[scripts/publish-notion-guide.ts](../scripts/publish-notion-guide.ts) si hay
un `NOTION_TOKEN` válido en `.env.local`. Si hay diferencias entre ambas, este
archivo en el repo es la fuente de verdad (la página de Notion se regenera a
partir de él) — volvé a publicar después de editar este archivo.

## Workspace y credenciales

- Workspace: "Notion de Franco Recabarren".
- Integración: "UNA MONEDITA" (Internal Integration Token, header `Authorization: Bearer <token>`).
- Todas las llamadas REST necesitan `Notion-Version: 2022-06-28`.
- El token NO se documenta acá — vive en `NOTION_TOKEN` (env var / secret manager),
  nunca en texto plano en el repo ni en esta página.
- **Página principal "Una Monedita":** a la fecha de escribir esto hay dos
  páginas con ese título en el workspace (histórico de duplicados). Antes de
  operar, confirmar cuál es la viva buscando "Una Monedita" y verificando que
  contiene las 6 bases de datos listadas abajo como hijas directas.

## Cómo consultar (leer filas)

**No usar `notion.databases.query` del SDK oficial (`@notionhq/client` v5) —
fue removido.** `dataSources.query` requiere un Data Source ID que un token de
integración estándar no puede obtener fácilmente. El camino que funciona:

```
POST https://api.notion.com/v1/databases/{database_id}/query
Authorization: Bearer <token>
Notion-Version: 2022-06-28
Content-Type: application/json

{ "filter": { ... }, "sorts": [ { "property": "Date", "direction": "descending" } ], "page_size": 50 }
```

`pages.create` y `pages.update` del SDK funcionan normalmente para escribir.
Para borrar una fila: `pages.update({ page_id, in_trash: true })` (soft-delete,
recuperable desde la papelera de Notion).

## Bases de datos

Todas cuelgan de la página principal "Una Monedita". IDs (UUID con guiones):

| Base | ID | Env var |
|---|---|---|
| Transactions | `36d5c48e-39b6-8172-ba4b-c2c59fa3fe6f` | `NOTION_DB_TRANSACTIONS` |
| Accounts | `36d5c48e-39b6-812a-864a-df660a69585e` | `NOTION_DB_ACCOUNTS` |
| Categories | `36d5c48e-39b6-8193-b122-ce5da3528802` | `NOTION_DB_CATEGORIES` |
| Subscriptions | `36d5c48e-39b6-81fd-b57c-c1d4033101e1` | `NOTION_DB_SUBSCRIPTIONS` |
| Budgets | `36d5c48e-39b6-81b5-be41-ed826914438b` | `NOTION_DB_BUDGETS` |
| FX Rates | `36d5c48e-39b6-8195-b489-d81b1bd2b9c8` | `NOTION_DB_FX_RATES` |

### Transactions

Cada fila = un movimiento (gasto, ingreso o transferencia).

| Propiedad | Tipo | Notas |
|---|---|---|
| `Name` | title | Etiqueta autogenerada `"{Type} · {Amount} {Currency}"` — no es la fuente de verdad del monto |
| `Type` | select | `Gasto` \| `Ingreso` \| `Transferencia` |
| `Amount` | number | Siempre positivo |
| `Currency` | select | `ARS` \| `USD` \| `EUR` \| `BTC` \| `ETH` \| `USDT` |
| `AmountBase` | number | Monto convertido a moneda base (opcional) |
| `FxRate` | number | Tipo de cambio usado (opcional) |
| `Date` | date | Fecha del movimiento (no la de creación) |
| `Notes` | rich_text | Nota libre |
| `Account` | relation → Accounts | Cuenta origen |
| `AccountTo` | relation → Accounts | Solo en `Transferencia` |
| `Category` | relation → Categories | |
| `Subscription` | relation → Subscriptions | Presente solo si la tx fue generada al registrar el pago de un recurrente |
| `CreatedAt` | created_time | Solo lectura |

**Crear una transacción de gasto:**
```json
POST /v1/pages
{
  "parent": { "database_id": "36d5c48e-39b6-8172-ba4b-c2c59fa3fe6f" },
  "properties": {
    "Name": { "title": [{ "text": { "content": "Gasto · 5000 ARS" } }] },
    "Type": { "select": { "name": "Gasto" } },
    "Amount": { "number": 5000 },
    "Currency": { "select": { "name": "ARS" } },
    "Date": { "date": { "start": "2026-08-01" } },
    "Category": { "relation": [{ "id": "<category_page_id>" }] }
  }
}
```

### Categories

| Propiedad | Tipo | Notas |
|---|---|---|
| `Name` | title | |
| `Kind` | select | `Gasto` \| `Ingreso` \| `Transferencia` |
| `Icon` | rich_text | Nombre de icono Lucide en PascalCase (ej. `Utensils`) — la app lo resuelve contra un registro explícito en `lib/icon-registry.ts`; si el nombre no está registrado ahí, cae a un icono genérico |
| `Color` | rich_text | Hex `#RRGGBB` |
| `Archived` | checkbox | Soft-delete — filtrar `Archived = false` al listar |

### Accounts

| Propiedad | Tipo | Notas |
|---|---|---|
| `Name` | title | |
| `Type` | select | `Banco` \| `Efectivo` \| `Tarjeta crédito` \| `Wallet virtual` \| `Cripto` |
| `Currency` | select | `ARS` \| `USD` \| `EUR` \| `BTC` \| `ETH` \| `USDT` |
| `InitialBalance` | number | Saldo inicial de la app. Se calcula desde Ajustes → "¿Cuánta plata tenés hoy?": es lo que tenés hoy menos el neto (ingresos − gastos) de todo lo fechado hasta hoy, así que **puede ser negativo**. La app lo lee/escribe de la cuenta "Principal" (o la primera no archivada) vía `/api/accounts/opening`; Disponible hoy = `InitialBalance` + ingresos − gastos hasta hoy |
| `Color` / `Icon` | rich_text | Igual convención que Categories |
| `Archived` | checkbox | Soft-delete |

> Los movimientos sin `Date` no entran en ningún total ni saldo de la app (los filtros de fecha de Notion los excluyen). Las `Transferencia` no cuentan como ingreso ni gasto.

### Subscriptions (gastos/ingresos recurrentes — "Fijos" en la app)

Cada fila = una obligación periódica (gym, suscripciones, dominios, sueldo,
etc.). Es una plantilla: no genera nada sola. La pantalla Fijos es una lista
única; cada fila tiene un botón ✓ "Registrar pago" que el usuario toca el día
que paga o le debitan (abre el modal de gasto precargado; la fecha propuesta es
hoy y se puede cambiar) — no hay cron ni cobro automático. Registrar el pago
crea una fila en Transactions enlazada por `Subscription` (así queda constancia
de qué día se hizo cada pago) y avanza `NextChargeDate` exactamente un período
desde el vencimiento cubierto (no desde la fecha del pago). Si hay varios
períodos atrasados, cada uno se registra por separado y el ítem sigue
"Pendiente" entre medio.

| Propiedad | Tipo | Notas |
|---|---|---|
| `Name` | title | |
| `Type` | select | `Gasto` \| `Ingreso` — determina el `Type` de la Transaction generada |
| `Amount` | number | Monto por período |
| `Currency` | select | `ARS` \| `USD` \| `EUR` \| `BTC` \| `ETH` \| `USDT` |
| `Frequency` | select | `Diaria` \| `Semanal` \| `Mensual` \| `Bimestral` \| `Trimestral` \| `Semestral` \| `Anual` \| `Personalizada` |
| `CustomIntervalDays` | number | Solo si `Frequency = Personalizada`: cada cuántos días |
| `DueDay` | number (1–31) | Día objetivo del mes para frecuencias mensuales y superiores (Mensual/Bimestral/Trimestral/Semestral/Anual). Si el mes no tiene ese día (ej. 31 en febrero), se usa el último día del mes — nunca se salta al mes siguiente |
| `StartDate` | date | Desde cuándo rige |
| `NextChargeDate` | date | Próximo vencimiento. Es el campo que gobierna todo: si `<= hoy` y `Status = Activa`, el ítem está "Pendiente"; si es futuro, el período actual ya está pagado |
| `LastChargedDate` | date | Fecha del último pago registrado (la que eligió el usuario) |
| `EndDate` | date, opcional | Al pasarla, el próximo cobro que caiga después la marca `Status = Cancelada` automáticamente |
| `AlertDaysBefore` | number | **Sin uso en la app** (la lista ya no tiene ventana de aviso). Se sigue escribiendo el default `3` al crear un fijo; no usarlo en lógica nueva |
| `AutoCreate` | checkbox | **Obsoleto — la app ya no lo lee, no lo escribe ni lo agrega con "Preparar Notion".** Todo fijo requiere que el usuario registre el pago. Queda en el schema por compatibilidad con datos viejos; no usarlo en lógica nueva |
| `Status` | select | `Activa` \| `Pausada` \| `Cancelada`. Solo `Activa` se cobra |
| `Notes` | rich_text | Opcional; el editor de la app ya no lo muestra |
| `Account` | relation → Accounts | Opcional |
| `Category` | relation → Categories | Opcional — la Transaction generada hereda esta categoría |

**Registrar el pago de un recurrente (misma lógica que usa el botón ✓ "Registrar
pago" — ver `lib/notion/payments.ts` `chargeSubscription()`):**
1. La fecha de la Transaction es la que elige el usuario (la app propone hoy y
   se puede cambiar; un agente debe preguntarla).
2. Calcular `NextChargeDate` nueva = una ocurrencia después de la
   `NextChargeDate` **actual** de la fila (el vencimiento que se está
   cubriendo), no después de la fecha elegida — respetando `Frequency`/
   `DueDay`/`CustomIntervalDays` (ver `lib/recurrence.ts` `addInterval()`).
3. Crear una Transaction con `Subscription` apuntando a esta fila y la fecha
   elegida.
4. `PATCH` la Subscription: `LastChargedDate = fecha elegida`,
   `NextChargeDate` = la calculada en el paso 2.
5. Si esa nueva `NextChargeDate` cae después de `EndDate`, además
   `Status = Cancelada`.

No cobrar dos veces el mismo período: releer la fila y comparar su
`NextChargeDate` contra la que se vio al decidir cobrar (`expectedNext`)
antes de escribir — si cambió, alguien ya registró ese pago mientras tanto.

## Cómo operar (recetas para un agente)

Procedimientos concretos sobre las bases de arriba. Todas las llamadas son
REST directo (ver "Cómo consultar" al principio de este documento) — no usar
`notion.databases.query` del SDK.

### Registrar un gasto suelto

```json
POST /v1/pages
{
  "parent": { "database_id": "36d5c48e-39b6-8172-ba4b-c2c59fa3fe6f" },
  "properties": {
    "Name": { "title": [{ "text": { "content": "Gasto · 3500 ARS" } }] },
    "Type": { "select": { "name": "Gasto" } },
    "Amount": { "number": 3500 },
    "Currency": { "select": { "name": "ARS" } },
    "Date": { "date": { "start": "2026-08-07" } },
    "Category": { "relation": [{ "id": "<category_page_id>" }] }
  }
}
```

Para un ingreso, `Type = "Ingreso"`. `Name` es cosmético — no leerlo como
fuente de verdad del monto, usar siempre `Amount`.

### Crear un fijo (gasto o ingreso recurrente)

Ejemplo: gimnasio, $15000 ARS, todos los meses cerca del día 14 (queda en
"Pendiente" hasta que Franco registra el pago — no hay cobro automático):

```json
POST /v1/pages
{
  "parent": { "database_id": "36d5c48e-39b6-81fd-b57c-c1d4033101e1" },
  "properties": {
    "Name": { "title": [{ "text": { "content": "Gimnasio" } }] },
    "Type": { "select": { "name": "Gasto" } },
    "Amount": { "number": 15000 },
    "Currency": { "select": { "name": "ARS" } },
    "Frequency": { "select": { "name": "Mensual" } },
    "DueDay": { "number": 14 },
    "StartDate": { "date": { "start": "2026-08-14" } },
    "NextChargeDate": { "date": { "start": "2026-08-14" } },
    "AlertDaysBefore": { "number": 3 },
    "Status": { "select": { "name": "Activa" } },
    "Category": { "relation": [{ "id": "<category_page_id>" }] }
  }
}
```

Otros ejemplos de la misma base: "Claude" (`Frequency: Mensual`, sin `DueDay`
fijo si cobra el mismo día que se dio de alta), "Dominio" (`Frequency: Anual`,
`DueDay` = día de renovación), un sueldo (`Type: Ingreso`, `Frequency:
Mensual`).

**Calcular la primera `NextChargeDate`:** si `Frequency` es
Mensual/Bimestral/Trimestral/Semestral/Anual y hay `DueDay`, usar la primera
ocurrencia de ese día-del-mes que sea `>= StartDate` (no saltar un período de
más). Si `Frequency` es Diaria/Semanal/Personalizada, `NextChargeDate` =
`StartDate` (no hay concepto de día-del-mes). Ver `firstChargeDate()` en
`lib/recurrence.ts` para la implementación exacta.

### Listar qué vence

Filtrar Subscriptions por `Status = Activa` y `NextChargeDate <= hoy`:

```json
POST /v1/databases/36d5c48e-39b6-81fd-b57c-c1d4033101e1/query
{
  "filter": {
    "and": [
      { "property": "Status", "select": { "equals": "Activa" } },
      { "property": "NextChargeDate", "date": { "on_or_before": "2026-08-07" } }
    ]
  },
  "sorts": [{ "property": "NextChargeDate", "direction": "ascending" }]
}
```

Todos los vencidos (activos, `NextChargeDate <= hoy`) figuran "Pendiente" en la
app — ningún fijo se cobra solo, no registrar pagos sin que Franco lo pida.

### Cobrar un fijo

Mismos pasos que usa el botón "Registrar pago" de la app
(`chargeSubscription()` en `lib/notion/payments.ts`):

1. **Releer la fila primero** (`GET /v1/pages/{id}`) y anotar su
   `NextChargeDate`. Si ya cambió respecto a lo que se vio al decidir cobrar,
   alguien ya registró ese pago mientras tanto — no repetir.
2. Definir la fecha del cobro (para un agente: preguntarle a Franco qué fecha
   usar, no asumir "hoy").
3. Calcular la nueva `NextChargeDate` = una ocurrencia después de la
   `NextChargeDate` leída en el paso 1 (no después de la fecha del cobro),
   respetando `Frequency`/`DueDay`/`CustomIntervalDays` (ver tabla de
   frecuencias abajo).
4. Crear una Transaction (ver receta de arriba) con la fecha del paso 2 y
   `Subscription: { "relation": [{ "id": "<subscription_page_id>" }] }`
   agregado a `properties`.
5. `PATCH` la Subscription:
   - `LastChargedDate` = fecha del cobro.
   - `NextChargeDate` = la calculada en el paso 3.
   - Si esa nueva `NextChargeDate` cae después de `EndDate` (cuando existe),
     además `Status = "Cancelada"`.

### Traducir frecuencia a fechas

| `Frequency` | Avance | Usa `DueDay` |
|---|---|---|
| `Diaria` | +1 día | No |
| `Semanal` | +7 días | No |
| `Mensual` | +1 mes | Sí |
| `Bimestral` | +2 meses | Sí |
| `Trimestral` | +3 meses | Sí |
| `Semestral` | +6 meses | Sí |
| `Anual` | +12 meses | Sí |
| `Personalizada` | +`CustomIntervalDays` días | No |

**Regla de clamp para frecuencias con `DueDay`:** si el mes destino no tiene
ese día (ej. `DueDay = 31` y el mes es febrero), usar el último día de ese mes
— nunca saltar al mes siguiente. Un fijo con `DueDay = 31` cobra el 28 (o 29)
de febrero, no el 3 de marzo.

### Qué NO tocar

- No editar `CreatedAt` (Transactions) ni otras propiedades de solo lectura.
- No borrar de verdad categorías/cuentas en uso — usar `Archived = true`
  (Categories/Accounts) o `in_trash: true` (Transactions/Subscriptions).
- No sumar montos de distinta `Currency` como si fueran comparables — no hay
  conversión automática.
- No cobrar un fijo sin releer su estado primero (ver "Cobrar un fijo" arriba).

### Budgets

| Propiedad | Tipo | Notas |
|---|---|---|
| `Name` | title | |
| `Limit` | number | |
| `Currency` | select | `ARS` \| `USD` \| `EUR` |
| `Month` | date | Primer día del mes que presupuesta (`YYYY-MM-01`) |
| `Recurring` | checkbox | Se repite todos los meses |
| `AlertAt80` | checkbox | Avisar al 80% del límite |
| `Category` | relation → Categories | |

Usado por la app desde Categorías (campo "Presupuesto mensual" al editar una
categoría de Gasto) y mostrado en el Resumen (barra de progreso gasto/límite,
solo cuando el rango visible es un mes completo). API: `GET/POST /api/budgets`,
`PATCH /api/budgets/[id]` — ver `lib/notion/budgets.ts`. Un presupuesto por
categoría y mes; no hay lógica automática que copie `Recurring = true` al mes
siguiente todavía (queda para un agente/cron futuro).

### FX Rates

| Propiedad | Tipo | Notas |
|---|---|---|
| `Pair` | title | Ej. `USD/ARS` |
| `Rate` | number | |
| `Date` | date | Un valor cacheado por par y por día |
| `Source` | select | `exchangerate.host` \| `CoinGecko` \| `manual` |

## Reglas de negocio para un agente

- **Moneda:** la app está pensada para ARS; multi-moneda existe en el schema
  pero no hay conversión automática en la UI — no asumir que sumar montos de
  distinta `Currency` da un total válido.
- **No editar `CreatedAt`** (Transactions) ni otras propiedades de solo
  lectura del sistema.
- **Borrar = archivar/papelera**, nunca borrar categorías/cuentas en uso
  (rompería las relaciones de transacciones históricas) — usar `Archived` en
  Categories/Accounts o `in_trash` en Transactions/Subscriptions.
- **Antes de cobrar un recurrente**, siempre releer la fila (`Status`,
  `NextChargeDate`, `LastChargedDate`) por si ya se registró su pago desde la app
  (u otro agente) entre que se decidió actuar y que se ejecuta la escritura.
