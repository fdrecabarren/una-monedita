import { NextResponse } from "next/server";
import { updateCategory, deleteCategory } from "@/lib/notion/categories";
import { getNotionCredsFromRequest } from "@/lib/auth/session";
import { checkMutationLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";

const PatchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  kind: z.enum(["Gasto", "Ingreso"]).optional(),
  icon: z.string().max(60).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Formato esperado: #RRGGBB").optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });
  if (!checkMutationLimit(request)) {
    return NextResponse.json({ error: "Demasiadas operaciones. Esperá un minuto." }, { status: 429 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body === null) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const cat = await updateCategory(id, parsed.data, creds);
  return NextResponse.json(cat);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const creds = await getNotionCredsFromRequest(request);
  if (!creds) return NextResponse.json({ error: "Notion no configurado" }, { status: 401 });
  if (!checkMutationLimit(request)) {
    return NextResponse.json({ error: "Demasiadas operaciones. Esperá un minuto." }, { status: 429 });
  }

  const { id } = await params;
  await deleteCategory(id, creds);
  return NextResponse.json({ ok: true });
}
