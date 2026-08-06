import { getNotionClient, DB_IDS, queryDatabase } from "./client";
import type { NotionCreds } from "@/lib/auth/session";
import { SubscriptionSchema, type Subscription, type Frequency, type SubscriptionStatus, type Currency } from "./schemas";
import { getTitle, getSelect, getNumber, getRichText, getDate, getRelationId, getCheckbox } from "./helpers";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

function pageToSubscription(page: PageObjectResponse): Subscription {
  const p = page.properties;
  return SubscriptionSchema.parse({
    id: page.id,
    name: getTitle(p["Name"]),
    type: getSelect(p["Type"]) as "Gasto" | "Ingreso" | null,
    amount: getNumber(p["Amount"]) ?? 0,
    currency: getSelect(p["Currency"]) as Currency | null,
    frequency: getSelect(p["Frequency"]) as Frequency | null,
    customIntervalDays: getNumber(p["CustomIntervalDays"]),
    dueDay: getNumber(p["DueDay"]),
    startDate: getDate(p["StartDate"]),
    nextChargeDate: getDate(p["NextChargeDate"]),
    lastChargedDate: getDate(p["LastChargedDate"]),
    endDate: getDate(p["EndDate"]),
    alertDaysBefore: getNumber(p["AlertDaysBefore"]) ?? 3,
    autoCreate: getCheckbox(p["AutoCreate"]),
    status: getSelect(p["Status"]) as SubscriptionStatus | null,
    notes: getRichText(p["Notes"]),
    accountId: getRelationId(p["Account"]),
    categoryId: getRelationId(p["Category"]),
  });
}

export async function getSubscriptions(status?: SubscriptionStatus, creds?: NotionCreds): Promise<Subscription[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = status
    ? { property: "Status", select: { equals: status } }
    : undefined;

  const res = await queryDatabase(
    creds?.dbIds.subscriptions ?? DB_IDS.subscriptions,
    {
      filter,
      sorts: [{ property: "NextChargeDate", direction: "ascending" }],
    },
    creds?.token
  );

  return res.results
    .filter((p): p is PageObjectResponse => p.object === "page" && "properties" in p)
    .map(pageToSubscription);
}

export async function getActiveSubscriptions(creds?: NotionCreds): Promise<Subscription[]> {
  return getSubscriptions("Activa", creds);
}

export async function getSubscriptionById(id: string, creds?: NotionCreds): Promise<Subscription | null> {
  const notion = getNotionClient(creds?.token);
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (page.object !== "page" || !("properties" in page)) return null;
    return pageToSubscription(page as PageObjectResponse);
  } catch {
    return null;
  }
}

export async function createSubscription(data: {
  name: string;
  type?: "Gasto" | "Ingreso";
  amount: number;
  currency: Currency;
  frequency: Frequency;
  customIntervalDays?: number;
  dueDay?: number;
  startDate: string;
  nextChargeDate: string;
  alertDaysBefore?: number;
  autoCreate?: boolean;
  accountId?: string;
  categoryId?: string;
  notes?: string;
}, creds?: NotionCreds): Promise<Subscription> {
  const notion = getNotionClient(creds?.token);
  const page = await notion.pages.create({
    parent: { database_id: creds?.dbIds.subscriptions ?? DB_IDS.subscriptions },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Type: { select: { name: data.type ?? "Gasto" } },
      Amount: { number: data.amount },
      Currency: { select: { name: data.currency } },
      Frequency: { select: { name: data.frequency } },
      StartDate: { date: { start: data.startDate } },
      NextChargeDate: { date: { start: data.nextChargeDate } },
      AlertDaysBefore: { number: data.alertDaysBefore ?? 3 },
      AutoCreate: { checkbox: data.autoCreate ?? false },
      Status: { select: { name: "Activa" } },
      ...(data.customIntervalDays != null ? { CustomIntervalDays: { number: data.customIntervalDays } } : {}),
      ...(data.dueDay != null ? { DueDay: { number: data.dueDay } } : {}),
      ...(data.accountId ? { Account: { relation: [{ id: data.accountId }] } } : {}),
      ...(data.categoryId ? { Category: { relation: [{ id: data.categoryId }] } } : {}),
      ...(data.notes ? { Notes: { rich_text: [{ text: { content: data.notes } }] } } : {}),
    },
  });
  return pageToSubscription(page as PageObjectResponse);
}

export async function updateSubscription(
  id: string,
  data: Partial<{
    name: string;
    type: "Gasto" | "Ingreso";
    amount: number;
    currency: Currency;
    frequency: Frequency;
    customIntervalDays: number;
    dueDay: number;
    startDate: string;
    nextChargeDate: string;
    lastChargedDate: string;
    endDate: string | null;
    alertDaysBefore: number;
    autoCreate: boolean;
    status: SubscriptionStatus;
    accountId: string;
    categoryId: string;
    notes: string;
  }>,
  creds?: NotionCreds
): Promise<Subscription> {
  const notion = getNotionClient(creds?.token);
  const page = await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.name ? { Name: { title: [{ text: { content: data.name } }] } } : {}),
      ...(data.type ? { Type: { select: { name: data.type } } } : {}),
      ...(data.amount != null ? { Amount: { number: data.amount } } : {}),
      ...(data.currency ? { Currency: { select: { name: data.currency } } } : {}),
      ...(data.frequency ? { Frequency: { select: { name: data.frequency } } } : {}),
      ...(data.customIntervalDays != null ? { CustomIntervalDays: { number: data.customIntervalDays } } : {}),
      ...(data.dueDay != null ? { DueDay: { number: data.dueDay } } : {}),
      ...(data.startDate ? { StartDate: { date: { start: data.startDate } } } : {}),
      ...(data.nextChargeDate ? { NextChargeDate: { date: { start: data.nextChargeDate } } } : {}),
      ...(data.lastChargedDate ? { LastChargedDate: { date: { start: data.lastChargedDate } } } : {}),
      ...(data.endDate !== undefined ? { EndDate: data.endDate ? { date: { start: data.endDate } } : { date: null } } : {}),
      ...(data.alertDaysBefore != null ? { AlertDaysBefore: { number: data.alertDaysBefore } } : {}),
      ...(data.autoCreate != null ? { AutoCreate: { checkbox: data.autoCreate } } : {}),
      ...(data.status ? { Status: { select: { name: data.status } } } : {}),
      ...(data.accountId ? { Account: { relation: [{ id: data.accountId }] } } : {}),
      ...(data.categoryId ? { Category: { relation: [{ id: data.categoryId }] } } : {}),
      ...(data.notes !== undefined ? { Notes: { rich_text: data.notes ? [{ text: { content: data.notes } }] : [] } } : {}),
    },
  });
  return pageToSubscription(page as PageObjectResponse);
}

// Kept for callers that only need to bump the next charge date.
export async function updateSubscriptionNextCharge(id: string, nextChargeDate: string, creds?: NotionCreds): Promise<void> {
  await updateSubscription(id, { nextChargeDate }, creds);
}

export async function updateSubscriptionStatus(id: string, status: SubscriptionStatus, creds?: NotionCreds): Promise<void> {
  await updateSubscription(id, { status }, creds);
}

export async function deleteSubscription(id: string, creds?: NotionCreds): Promise<void> {
  const notion = getNotionClient(creds?.token);
  await notion.pages.update({ page_id: id, in_trash: true });
}
