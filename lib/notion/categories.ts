import { getNotionClient, DB_IDS, queryDatabase } from "./client";
import type { NotionCreds } from "@/lib/auth/session";
import { CategorySchema, type Category, type CategoryKind } from "./schemas";
import { getTitle, getSelect, getRichText, getCheckbox } from "./helpers";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

function pageToCategory(page: PageObjectResponse): Category {
  const p = page.properties;
  return CategorySchema.parse({
    id: page.id,
    name: getTitle(p["Name"]),
    kind: getSelect(p["Kind"]) as CategoryKind | null,
    icon: getRichText(p["Icon"]),
    color: getRichText(p["Color"]),
    archived: getCheckbox(p["Archived"]),
  });
}

export async function getCategories(kind?: "Ingreso" | "Gasto", creds?: NotionCreds): Promise<Category[]> {
  const filter = kind
    ? ({ property: "Kind", select: { equals: kind } } as const)
    : undefined;

  const res = await queryDatabase(
    creds?.dbIds.categories ?? DB_IDS.categories,
    {
      filter,
      sorts: [{ property: "Name", direction: "ascending" }],
    },
    creds?.token
  );

  return res.results
    .filter((p): p is PageObjectResponse => p.object === "page" && "properties" in p)
    .map(pageToCategory)
    .filter((c) => !c.archived);
}

export async function getCategoryById(id: string, creds?: NotionCreds): Promise<Category | null> {
  const notion = getNotionClient(creds?.token);
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (page.object !== "page" || !("properties" in page)) return null;
    return pageToCategory(page as PageObjectResponse);
  } catch {
    return null;
  }
}

export async function createCategory(data: {
  name: string;
  kind: CategoryKind;
  icon?: string;
  color?: string;
}, creds?: NotionCreds): Promise<Category> {
  const notion = getNotionClient(creds?.token);
  const page = await notion.pages.create({
    parent: { database_id: creds?.dbIds.categories ?? DB_IDS.categories },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Kind: { select: { name: data.kind } },
      ...(data.icon ? { Icon: { rich_text: [{ text: { content: data.icon } }] } } : {}),
      ...(data.color ? { Color: { rich_text: [{ text: { content: data.color } }] } } : {}),
    },
  });
  return pageToCategory(page as PageObjectResponse);
}

export async function updateCategory(
  id: string,
  data: Partial<{ name: string; kind: CategoryKind; icon: string; color: string; archived: boolean }>,
  creds?: NotionCreds
): Promise<Category> {
  const notion = getNotionClient(creds?.token);
  const page = await notion.pages.update({
    page_id: id,
    properties: {
      ...(data.name ? { Name: { title: [{ text: { content: data.name } }] } } : {}),
      ...(data.kind ? { Kind: { select: { name: data.kind } } } : {}),
      ...(data.icon !== undefined ? { Icon: { rich_text: data.icon ? [{ text: { content: data.icon } }] : [] } } : {}),
      ...(data.color !== undefined ? { Color: { rich_text: data.color ? [{ text: { content: data.color } }] : [] } } : {}),
      ...(data.archived !== undefined ? { Archived: { checkbox: data.archived } } : {}),
    },
  });
  return pageToCategory(page as PageObjectResponse);
}

// Soft-delete: archive so existing transactions keep their relation intact.
export async function deleteCategory(id: string, creds?: NotionCreds): Promise<void> {
  await updateCategory(id, { archived: true }, creds);
}

// Hard list incl. archived (used by reset/migration).
export async function getAllCategoriesRaw(creds?: NotionCreds): Promise<Category[]> {
  const res = await queryDatabase(
    creds?.dbIds.categories ?? DB_IDS.categories,
    {
      sorts: [{ property: "Name", direction: "ascending" }],
    },
    creds?.token
  );
  return res.results
    .filter((p): p is PageObjectResponse => p.object === "page" && "properties" in p)
    .map(pageToCategory);
}
