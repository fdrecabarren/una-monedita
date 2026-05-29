import { getNotionClient, DB_IDS, queryDatabase } from "./client";
import { AccountSchema, type Account, type AccountType, type Currency } from "./schemas";
import { getTitle, getSelect, getRichText, getNumber, getCheckbox } from "./helpers";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

function pageToAccount(page: PageObjectResponse): Account {
  const p = page.properties;
  return AccountSchema.parse({
    id: page.id,
    name: getTitle(p["Name"]),
    type: getSelect(p["Type"]) as AccountType | null,
    currency: getSelect(p["Currency"]) as Currency | null,
    initialBalance: getNumber(p["InitialBalance"]) ?? 0,
    color: getRichText(p["Color"]),
    icon: getRichText(p["Icon"]),
    archived: getCheckbox(p["Archived"]),
  });
}

export async function getAccounts(): Promise<Account[]> {
  const notion = getNotionClient();
  const res = await queryDatabase(DB_IDS.accounts, {
    sorts: [{ property: "Name", direction: "ascending" }],
  });
  return res.results
    .filter((p): p is PageObjectResponse => p.object === "page" && "properties" in p)
    .map(pageToAccount)
    .filter((a) => !a.archived);
}

export async function getAccountById(id: string): Promise<Account | null> {
  const notion = getNotionClient();
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (page.object !== "page" || !("properties" in page)) return null;
    return pageToAccount(page as PageObjectResponse);
  } catch {
    return null;
  }
}

export async function createAccount(data: {
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance?: number;
  color?: string;
  icon?: string;
}): Promise<Account> {
  const notion = getNotionClient();
  const page = await notion.pages.create({
    parent: { database_id: DB_IDS.accounts },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Type: { select: { name: data.type } },
      Currency: { select: { name: data.currency } },
      InitialBalance: { number: data.initialBalance ?? 0 },
      ...(data.color ? { Color: { rich_text: [{ text: { content: data.color } }] } } : {}),
      ...(data.icon ? { Icon: { rich_text: [{ text: { content: data.icon } }] } } : {}),
    },
  });
  return pageToAccount(page as PageObjectResponse);
}

export async function updateAccount(
  id: string,
  data: Partial<{
    name: string;
    type: AccountType;
    currency: Currency;
    initialBalance: number;
    archived: boolean;
  }>
): Promise<Account> {
  const notion = getNotionClient();
  const page = await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.name ? { Name: { title: [{ text: { content: data.name } }] } } : {}),
      ...(data.type ? { Type: { select: { name: data.type } } } : {}),
      ...(data.currency ? { Currency: { select: { name: data.currency } } } : {}),
      ...(data.initialBalance !== undefined ? { InitialBalance: { number: data.initialBalance } } : {}),
      ...(data.archived !== undefined ? { Archived: { checkbox: data.archived } } : {}),
    },
  });
  return pageToAccount(page as PageObjectResponse);
}
