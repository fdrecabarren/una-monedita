import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

type PropValue = PageObjectResponse["properties"][string];

export function getTitle(prop: PropValue): string {
  if (prop.type === "title") {
    return prop.title.map((t) => t.plain_text).join("");
  }
  return "";
}

export function getRichText(prop: PropValue): string | null {
  if (prop.type === "rich_text") {
    const text = prop.rich_text.map((t) => t.plain_text).join("");
    return text || null;
  }
  return null;
}

export function getSelect(prop: PropValue): string | null {
  if (prop.type === "select") return prop.select?.name ?? null;
  return null;
}

export function getNumber(prop: PropValue): number | null {
  if (prop.type === "number") return prop.number ?? null;
  return null;
}

export function getCheckbox(prop: PropValue): boolean {
  if (prop.type === "checkbox") return prop.checkbox;
  return false;
}

export function getDate(prop: PropValue): string | null {
  if (prop.type === "date") return prop.date?.start ?? null;
  return null;
}

export function getCreatedTime(prop: PropValue): string {
  if (prop.type === "created_time") return prop.created_time;
  return new Date().toISOString();
}

export function getRelationId(prop: PropValue): string | null {
  if (prop.type === "relation" && prop.relation.length > 0) {
    return prop.relation[0].id;
  }
  return null;
}

export function stripDashes(id: string): string {
  return id.replace(/-/g, "");
}
