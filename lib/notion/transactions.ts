import { getNotionClient, DB_IDS, queryDatabase } from "./client";
import { TransactionSchema, type Transaction, type TransactionType, type Currency } from "./schemas";
import { getTitle, getSelect, getNumber, getRichText, getDate, getCreatedTime, getRelationId } from "./helpers";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

function pageToTransaction(page: PageObjectResponse): Transaction {
  const p = page.properties;
  return TransactionSchema.parse({
    id: page.id,
    name: getTitle(p["Name"]),
    type: getSelect(p["Type"]) as TransactionType | null,
    amount: getNumber(p["Amount"]) ?? 0,
    currency: getSelect(p["Currency"]) as Currency | null,
    amountBase: getNumber(p["AmountBase"]),
    fxRate: getNumber(p["FxRate"]),
    date: getDate(p["Date"]),
    notes: getRichText(p["Notes"]),
    accountId: getRelationId(p["Account"]),
    accountToId: getRelationId(p["AccountTo"]),
    categoryId: getRelationId(p["Category"]),
    subscriptionId: getRelationId(p["Subscription"]),
    createdAt: getCreatedTime(p["CreatedAt"]),
  });
}

export interface GetTransactionsOptions {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  accountId?: string;
  type?: TransactionType;
  pageSize?: number;
  startCursor?: string;
}

export async function getTransactions(opts: GetTransactionsOptions = {}): Promise<{
  transactions: Transaction[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const notion = getNotionClient();

  type PropertyFilter = {
    property: string;
    select?: { equals: string };
    relation?: { contains: string };
    date?: { on_or_after?: string; on_or_before?: string };
  };

  const filters: PropertyFilter[] = [];

  if (opts.type) filters.push({ property: "Type", select: { equals: opts.type } });
  if (opts.categoryId) filters.push({ property: "Category", relation: { contains: opts.categoryId } });
  if (opts.accountId) filters.push({ property: "Account", relation: { contains: opts.accountId } });
  if (opts.startDate) filters.push({ property: "Date", date: { on_or_after: opts.startDate } });
  if (opts.endDate) filters.push({ property: "Date", date: { on_or_before: opts.endDate } });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any =
    filters.length === 0 ? undefined :
    filters.length === 1 ? filters[0] :
    { and: filters };

  const res = await queryDatabase(DB_IDS.transactions, {
    filter,
    sorts: [{ property: "Date", direction: "descending" }],
    page_size: opts.pageSize ?? 50,
    ...(opts.startCursor ? { start_cursor: opts.startCursor } : {}),
  });

  const transactions = res.results
    .filter((p): p is PageObjectResponse => p.object === "page" && "properties" in p)
    .map(pageToTransaction);

  return { transactions, nextCursor: res.next_cursor, hasMore: res.has_more };
}

export async function getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  const { transactions } = await getTransactions({ startDate: start, endDate: end, pageSize: 100 });
  return transactions;
}

export async function createTransaction(data: {
  type: TransactionType;
  amount: number;
  currency: Currency;
  amountBase?: number;
  fxRate?: number;
  date: string;
  accountId?: string;
  accountToId?: string;
  categoryId?: string;
  subscriptionId?: string;
  notes?: string;
}): Promise<Transaction> {
  const notion = getNotionClient();
  const label = `${data.type} · ${data.amount} ${data.currency}`;

  const page = await notion.pages.create({
    parent: { database_id: DB_IDS.transactions },
    properties: {
      Name: { title: [{ text: { content: label } }] },
      Type: { select: { name: data.type } },
      Amount: { number: data.amount },
      Currency: { select: { name: data.currency } },
      ...(data.amountBase != null ? { AmountBase: { number: data.amountBase } } : {}),
      ...(data.fxRate != null ? { FxRate: { number: data.fxRate } } : {}),
      Date: { date: { start: data.date } },
      ...(data.accountId ? { Account: { relation: [{ id: data.accountId }] } } : {}),
      ...(data.accountToId ? { AccountTo: { relation: [{ id: data.accountToId }] } } : {}),
      ...(data.categoryId ? { Category: { relation: [{ id: data.categoryId }] } } : {}),
      ...(data.subscriptionId ? { Subscription: { relation: [{ id: data.subscriptionId }] } } : {}),
      ...(data.notes ? { Notes: { rich_text: [{ text: { content: data.notes } }] } } : {}),
    },
  });

  return pageToTransaction(page as PageObjectResponse);
}

export async function updateTransaction(
  id: string,
  data: Partial<{
    type: TransactionType;
    amount: number;
    currency: Currency;
    amountBase: number;
    fxRate: number;
    date: string;
    accountId: string;
    categoryId: string;
    notes: string;
  }>
): Promise<Transaction> {
  const notion = getNotionClient();
  const page = await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.type ? { Type: { select: { name: data.type } } } : {}),
      ...(data.amount != null ? { Amount: { number: data.amount } } : {}),
      ...(data.currency ? { Currency: { select: { name: data.currency } } } : {}),
      ...(data.amountBase != null ? { AmountBase: { number: data.amountBase } } : {}),
      ...(data.fxRate != null ? { FxRate: { number: data.fxRate } } : {}),
      ...(data.date ? { Date: { date: { start: data.date } } } : {}),
      ...(data.accountId ? { Account: { relation: [{ id: data.accountId }] } } : {}),
      ...(data.categoryId ? { Category: { relation: [{ id: data.categoryId }] } } : {}),
      ...(data.notes !== undefined ? { Notes: { rich_text: data.notes ? [{ text: { content: data.notes } }] : [] } } : {}),
    },
  });
  return pageToTransaction(page as PageObjectResponse);
}

export async function deleteTransaction(id: string): Promise<void> {
  const notion = getNotionClient();
  await notion.pages.update({ page_id: id, in_trash: true });
}
