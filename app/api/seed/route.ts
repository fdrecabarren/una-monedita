import { NextResponse } from "next/server";
import { getCategories, createCategory } from "@/lib/notion/categories";
import type { CategoryKind } from "@/lib/notion/schemas";

const DEFAULTS: { kind: CategoryKind; name: string; icon: string }[] = [
  { kind: "Gasto", name: "Comida", icon: "🍔" },
  { kind: "Gasto", name: "Transporte", icon: "🚌" },
  { kind: "Gasto", name: "Entretenimiento", icon: "🎮" },
  { kind: "Gasto", name: "Salud", icon: "🏥" },
  { kind: "Gasto", name: "Ropa", icon: "👕" },
  { kind: "Gasto", name: "Servicios", icon: "💡" },
  { kind: "Gasto", name: "Casa", icon: "🏠" },
  { kind: "Gasto", name: "Otros", icon: "📦" },
  { kind: "Ingreso", name: "Sueldo", icon: "💼" },
  { kind: "Ingreso", name: "Freelance", icon: "💻" },
  { kind: "Ingreso", name: "Inversiones", icon: "📈" },
  { kind: "Ingreso", name: "Regalo", icon: "🎁" },
  { kind: "Ingreso", name: "Reembolso", icon: "💸" },
  { kind: "Ingreso", name: "Otros", icon: "📦" },
];

// GET: seeds if empty, returns current count
export async function GET() {
  const existing = await getCategories();
  if (existing.length > 0) {
    return NextResponse.json({ seeded: false, count: existing.length });
  }
  for (const item of DEFAULTS) {
    await createCategory({ name: item.name, kind: item.kind, icon: item.icon });
  }
  return NextResponse.json({ seeded: true, count: DEFAULTS.length });
}
