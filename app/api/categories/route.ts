import { NextResponse } from "next/server";
import { getCategories } from "@/lib/notion/categories";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const cats = await getCategories(
    kind === "Ingreso" || kind === "Gasto" ? kind : undefined
  );
  return NextResponse.json(cats);
}
