import { getNotionClient, DB_IDS, queryDatabase } from "./client";
import type { NotionCreds } from "@/lib/auth/session";
import { BudgetSchema, type Budget } from "./schemas";
import { getTitle, getSelect, getNumber, getDate, getCheckbox, getRelationId } from "./helpers";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

function pageToBudget(page: PageObjectResponse): Budget {
  const p = page.properties;
  return BudgetSchema.parse({
    id: page.id,
    name: getTitle(p["Name"]),
    limit: getNumber(p["Limit"]) ?? 0,
    currency: getSelect(p["Currency"]) as "ARS" | "USD" | "EUR" | null,
    month: getDate(p["Month"]),
    recurring: getCheckbox(p["Recurring"]),
    alertAt80: getCheckbox(p["AlertAt80"]),
    categoryId: getRelationId(p["Category"]),
  });
}

export async function getBudgetsByMonth(year: number, month: number, creds?: NotionCreds): Promise<Budget[]> {
  const monthStr = `${year}-${String(month).padStart(2, "0")}-01`;

  const res = await queryDatabase(
    creds?.dbIds.budgets ?? DB_IDS.budgets,
    { filter: { property: "Month", date: { equals: monthStr } } },
    creds?.token
  );

  return res.results
    .filter((p): p is PageObjectResponse => p.object === "page" && "properties" in p)
    .map(pageToBudget);
}

export async function createBudget(data: {
  name: string;
  limit: number;
  currency: "ARS" | "USD" | "EUR";
  month: string;
  recurring?: boolean;
  alertAt80?: boolean;
  categoryId?: string;
}, creds?: NotionCreds): Promise<Budget> {
  const notion = getNotionClient(creds?.token);
  const page = await notion.pages.create({
    parent: { database_id: creds?.dbIds.budgets ?? DB_IDS.budgets },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Limit: { number: data.limit },
      Currency: { select: { name: data.currency } },
      Month: { date: { start: data.month } },
      Recurring: { checkbox: data.recurring ?? true },
      AlertAt80: { checkbox: data.alertAt80 ?? true },
      ...(data.categoryId ? { Category: { relation: [{ id: data.categoryId }] } } : {}),
    },
  });
  return pageToBudget(page as PageObjectResponse);
}

export async function updateBudget(
  id: string,
  data: Partial<{ limit: number; recurring: boolean; alertAt80: boolean }>,
  creds?: NotionCreds
): Promise<Budget> {
  const notion = getNotionClient(creds?.token);
  const page = await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.limit != null ? { Limit: { number: data.limit } } : {}),
      ...(data.recurring != null ? { Recurring: { checkbox: data.recurring } } : {}),
      ...(data.alertAt80 != null ? { AlertAt80: { checkbox: data.alertAt80 } } : {}),
    },
  });
  return pageToBudget(page as PageObjectResponse);
}
