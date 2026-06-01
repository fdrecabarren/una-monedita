import { NextResponse } from "next/server";
import { updateCategory, deleteCategory } from "@/lib/notion/categories";
import { z } from "zod";

const PatchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  kind: z.enum(["Gasto", "Ingreso"]).optional(),
  icon: z.string().max(60).optional(),
  color: z.string().max(20).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const cat = await updateCategory(id, parsed.data);
  return NextResponse.json(cat);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteCategory(id);
  return NextResponse.json({ ok: true });
}
