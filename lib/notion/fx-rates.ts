import { getNotionClient, DB_IDS, queryDatabase } from "./client";
import { FxRateSchema, type FxRate } from "./schemas";
import { getTitle, getNumber, getDate, getSelect } from "./helpers";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

function pageToFxRate(page: PageObjectResponse): FxRate {
  const p = page.properties;
  return FxRateSchema.parse({
    id: page.id,
    pair: getTitle(p["Pair"]),
    rate: getNumber(p["Rate"]) ?? 0,
    date: getDate(p["Date"]),
    source: getSelect(p["Source"]) as FxRate["source"],
  });
}

export async function getCachedRate(pair: string): Promise<FxRate | null> {
  const notion = getNotionClient();
  const today = new Date().toISOString().split("T")[0];

  const res = await queryDatabase(DB_IDS.fxRates, {
    filter: {
      and: [
        { property: "Pair", title: { equals: pair } },
        { property: "Date", date: { equals: today } },
      ],
    },
    page_size: 1,
  });

  const page = res.results.find(
    (p): p is PageObjectResponse => p.object === "page" && "properties" in p
  );
  return page ? pageToFxRate(page) : null;
}

export async function saveRate(
  pair: string,
  rate: number,
  source: FxRate["source"]
): Promise<FxRate> {
  const notion = getNotionClient();
  const today = new Date().toISOString().split("T")[0];

  const page = await notion.pages.create({
    parent: { database_id: DB_IDS.fxRates },
    properties: {
      Pair: { title: [{ text: { content: pair } }] },
      Rate: { number: rate },
      Date: { date: { start: today } },
      ...(source ? { Source: { select: { name: source } } } : {}),
    },
  });
  return pageToFxRate(page as PageObjectResponse);
}
