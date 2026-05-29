import { getNotionClient, DB_IDS, queryDatabase } from "./client";
import { SubscriptionSchema, type Subscription, type Frequency, type SubscriptionStatus, type Currency } from "./schemas";
import { getTitle, getSelect, getNumber, getRichText, getDate, getRelationId } from "./helpers";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

function pageToSubscription(page: PageObjectResponse): Subscription {
  const p = page.properties;
  return SubscriptionSchema.parse({
    id: page.id,
    name: getTitle(p["Name"]),
    amount: getNumber(p["Amount"]) ?? 0,
    currency: getSelect(p["Currency"]) as Currency | null,
    frequency: getSelect(p["Frequency"]) as Frequency | null,
    customIntervalDays: getNumber(p["CustomIntervalDays"]),
    startDate: getDate(p["StartDate"]),
    nextChargeDate: getDate(p["NextChargeDate"]),
    alertDaysBefore: getNumber(p["AlertDaysBefore"]) ?? 3,
    status: getSelect(p["Status"]) as SubscriptionStatus | null,
    notes: getRichText(p["Notes"]),
    accountId: getRelationId(p["Account"]),
    categoryId: getRelationId(p["Category"]),
  });
}

export async function getSubscriptions(status?: SubscriptionStatus): Promise<Subscription[]> {
  const notion = getNotionClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = status
    ? { property: "Status", select: { equals: status } }
    : undefined;

  const res = await queryDatabase(DB_IDS.subscriptions, {
    filter,
    sorts: [{ property: "NextChargeDate", direction: "ascending" }],
  });

  return res.results
    .filter((p): p is PageObjectResponse => p.object === "page" && "properties" in p)
    .map(pageToSubscription);
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  return getSubscriptions("Activa");
}

export async function createSubscription(data: {
  name: string;
  amount: number;
  currency: Currency;
  frequency: Frequency;
  customIntervalDays?: number;
  startDate: string;
  nextChargeDate: string;
  alertDaysBefore?: number;
  accountId?: string;
  categoryId?: string;
  notes?: string;
}): Promise<Subscription> {
  const notion = getNotionClient();
  const page = await notion.pages.create({
    parent: { database_id: DB_IDS.subscriptions },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Amount: { number: data.amount },
      Currency: { select: { name: data.currency } },
      Frequency: { select: { name: data.frequency } },
      StartDate: { date: { start: data.startDate } },
      NextChargeDate: { date: { start: data.nextChargeDate } },
      AlertDaysBefore: { number: data.alertDaysBefore ?? 3 },
      Status: { select: { name: "Activa" } },
      ...(data.customIntervalDays != null ? { CustomIntervalDays: { number: data.customIntervalDays } } : {}),
      ...(data.accountId ? { Account: { relation: [{ id: data.accountId }] } } : {}),
      ...(data.categoryId ? { Category: { relation: [{ id: data.categoryId }] } } : {}),
      ...(data.notes ? { Notes: { rich_text: [{ text: { content: data.notes } }] } } : {}),
    },
  });
  return pageToSubscription(page as PageObjectResponse);
}

export async function updateSubscriptionNextCharge(id: string, nextChargeDate: string): Promise<void> {
  const notion = getNotionClient();
  await notion.pages.update({
    page_id: id,
    properties: { NextChargeDate: { date: { start: nextChargeDate } } },
  });
}

export async function updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<void> {
  const notion = getNotionClient();
  await notion.pages.update({
    page_id: id,
    properties: { Status: { select: { name: status } } },
  });
}
