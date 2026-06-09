import { NextResponse } from "next/server";
import { getCategories, createCategory } from "@/lib/notion/categories";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const cats = await getCategories(
    kind === "Ingreso" || kind === "Gasto" ? kind : undefined,
    creds
  );
  return NextResponse.json(cats);
}

const CreateSchema = z.object({
  name: z.string().min(1).max(60),
  kind: z.enum(["Gasto", "Ingreso"]),
  icon: z.string().max(60).optional(),
  color: z.string().max(20).optional(),
});

export async function POST(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });

  const body = await request.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const cat = await createCategory(parsed.data, creds);
  return NextResponse.json(cat, { status: 201 });
}
