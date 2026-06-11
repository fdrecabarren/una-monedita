import { NextResponse } from "next/server";
import { getCategories, createCategory } from "@/lib/notion/categories";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
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
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Formato esperado: #RRGGBB").optional(),
});

export async function POST(request: Request) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });
  if (!checkMutationLimit(request)) {
    return NextResponse.json({ error: "Demasiadas operaciones. Esperá un minuto." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (body === null) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const cat = await createCategory(parsed.data, creds);
  return NextResponse.json(cat, { status: 201 });
}
