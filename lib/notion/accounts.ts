import { getNotionClient, DB_IDS, queryDatabase } from "./client";
import type { NotionCreds } from "@/lib/auth/session";
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

export async function getAccounts(creds?: NotionCreds): Promise<Account[]> {
  const res = await queryDatabase(
    creds?.dbIds.accounts ?? DB_IDS.accounts,
    { sorts: [{ property: "Name", direction: "ascending" }] },
    creds?.token
  );
  return res.results
    .filter((p): p is PageObjectResponse => p.object === "page" && "properties" in p)
    .map(pageToAccount)
    .filter((a) => !a.archived);
}

export async function getAccountById(id: string, creds?: NotionCreds): Promise<Account | null> {
  const notion = getNotionClient(creds?.token);
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (page.object !== "page" || !("properties" in page)) return null;
    return pageToAccount(page as PageObjectResponse);
  } catch {
    return null;
  }
}

export async function createAccount(
  data: {
    name: string;
    type: AccountType;
    currency: Currency;
    initialBalance?: number;
    color?: string;
    icon?: string;
  },
  creds?: NotionCreds
): Promise<Account> {
  const notion = getNotionClient(creds?.token);
  const page = await notion.pages.create({
    parent: { database_id: creds?.dbIds.accounts ?? DB_IDS.accounts },
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
  }>,
  creds?: NotionCreds
): Promise<Account> {
  const notion = getNotionClient(creds?.token);
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

// Cuenta que guarda el saldo inicial de la app: la llamada "Principal" o, si no
// existe, la primera no archivada. La app no maneja cuentas todavía: el saldo
// inicial es lo que Franco tenía antes de registrar su primer movimiento.
export async function getMainAccount(creds?: NotionCreds): Promise<Account | null> {
  const accounts = await getAccounts(creds);
  return accounts.find((a) => a.name.trim().toLowerCase() === "principal") ?? accounts[0] ?? null;
}
