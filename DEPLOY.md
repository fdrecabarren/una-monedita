# Guía de instalación — UNA MONEDITA

Despliega tu propia copia privada de la app, conectada a tu propia cuenta de Notion.
Tus datos viven solo en tu Notion y tu Vercel. Nadie más los ve.

---

## Resumen

1. Duplica la plantilla de Notion a tu cuenta
2. Crea una integración de Notion y compártela con tu página
3. Despliega la app en tu propio Vercel
4. Conecta Notion (dentro de la app o por variables de entorno)
5. Usa la app

---

## 1. Duplica la plantilla de Notion

1. Abre la plantilla: <https://app.notion.com/p/UNA-MONEDITA-copy-3795c48e39b6803da9abf7ab40919b39?source=copy_link>
2. Arriba a la derecha pulsa **Duplicar** (Duplicate).
3. Se copiará "UNA MONEDITA" a tu cuenta, con 6 bases de datos dentro:
   Categories, Accounts, FX Rates, Subscriptions, Budgets, Transactions.

## 2. Crea una integración de Notion

1. Ve a <https://www.notion.so/my-integrations> → **New integration**.
2. Nombre: `UNA MONEDITA` (o el que quieras). Créala.
3. Copia el **Internal Integration Token** (empieza con `ntn_` o `secret_`). Guárdalo.

## 3. Comparte tu página con la integración

1. Abre tu página duplicada en Notion.
2. Arriba a la derecha: menú **⋯** → **Conexiones** (Connections).
3. Busca tu integración y agrégala. Esto le da acceso a las 6 bases de datos.

## 4. Despliega en Vercel

1. Acepta la invitación de colaborador al repositorio privado de GitHub.
2. Entra a <https://vercel.com> → **New Project** → importa el repositorio.
3. Configura las variables de entorno **obligatorias**:

   | Variable | Valor |
   |----------|-------|
   | `APP_PASSWORD` | Tu contraseña para entrar a la app |
   | `AUTH_COOKIE_SECRET` | Texto aleatorio de 32+ caracteres |
   | `CRON_SECRET` | Texto aleatorio (cualquiera) |

   Para generar texto aleatorio: en una terminal corre `openssl rand -base64 32`,
   o usa cualquier generador de contraseñas largas.

4. Pulsa **Deploy**. Espera a que termine.

## 5. Conecta Notion

Tienes dos opciones. Elige una.

### Opción A — Dentro de la app (recomendada, sin tocar Vercel)

1. Abre tu app desplegada y entra con tu `APP_PASSWORD`.
2. La app te llevará a la pantalla **Conecta tu Notion** (`/setup`).
3. Pega:
   - El **token** de integración (paso 2).
   - La **URL de tu página** duplicada (en Notion: Compartir → Copiar enlace).
4. Pulsa **Conectar**. La app encuentra tus 6 bases de datos automáticamente.

> Nota: esta conexión se guarda en la cookie de tu sesión. Si borras las cookies
> del navegador, vuelve a `/setup` y reconéctala (2 minutos).

### Opción B — Variables de entorno (persistente)

En Vercel → Settings → Environment Variables, agrega:

```
NOTION_TOKEN=<tu token de integración>
NOTION_DB_TRANSACTIONS=<id de la base Transactions>
NOTION_DB_CATEGORIES=<id de la base Categories>
NOTION_DB_ACCOUNTS=<id de la base Accounts>
NOTION_DB_SUBSCRIPTIONS=<id de la base Subscriptions>
NOTION_DB_BUDGETS=<id de la base Budgets>
NOTION_DB_FX_RATES=<id de la base FX Rates>
```

El ID de cada base es la parte de 32 caracteres en la URL de esa base
(ábrela como página completa en Notion y mira la URL). Luego **redeploy**.

## 6. Usa la app

Entra con tu contraseña y empieza a registrar gastos e ingresos.
La moneda por defecto es **Euro**; puedes cambiarla en **Ajustes → Moneda**.

---

## Notas

- La contraseña (`APP_PASSWORD`) es solo tuya en tu deploy privado. Si la olvidas,
  cámbiala en Vercel → Settings → Environment Variables → redeploy.
- Si la app dice "Notion no configurado", ve a **Ajustes → Conectar Notion** o `/setup`.
- Si `/setup` dice que no encuentra alguna base de datos: revisa que duplicaste la
  plantilla correcta y que compartiste la página con tu integración (paso 3).
