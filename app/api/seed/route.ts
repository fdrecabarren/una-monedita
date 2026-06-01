import { NextResponse } from "next/server";
import {
  getCategories,
  getAllCategoriesRaw,
  createCategory,
  updateCategory,
} from "@/lib/notion/categories";
import type { CategoryKind } from "@/lib/notion/schemas";

// Monefy-style design category set: Lucide icon (PascalCase) + hex color.
const DEFAULTS: { kind: CategoryKind; name: string; icon: string; color: string }[] = [
  { kind: "Gasto", name: "Comida", icon: "Utensils", color: "#ff8a5c" },
  { kind: "Gasto", name: "Supermercado", icon: "ShoppingCart", color: "#46bfae" },
  { kind: "Gasto", name: "Transporte", icon: "Car", color: "#4fb6e6" },
  { kind: "Gasto", name: "Casa", icon: "House", color: "#9b8cdb" },
  { kind: "Gasto", name: "Servicios", icon: "Plug", color: "#6ec6c0" },
  { kind: "Gasto", name: "Ropa", icon: "Shirt", color: "#ef7aa6" },
  { kind: "Gasto", name: "Ocio", icon: "Gamepad2", color: "#ffb04d" },
  { kind: "Gasto", name: "Salud", icon: "HeartPulse", color: "#ef6d6d" },
  { kind: "Gasto", name: "Café", icon: "Coffee", color: "#b08968" },
  { kind: "Gasto", name: "Mascotas", icon: "PawPrint", color: "#9ccc65" },
  { kind: "Gasto", name: "Educación", icon: "GraduationCap", color: "#7b8cd6" },
  { kind: "Gasto", name: "Regalos", icon: "Gift", color: "#c382d6" },
  { kind: "Ingreso", name: "Salario", icon: "Wallet", color: "#2fa86a" },
  { kind: "Ingreso", name: "Changas", icon: "Briefcase", color: "#2fa86a" },
  { kind: "Ingreso", name: "Ahorros", icon: "PiggyBank", color: "#2fa86a" },
];

async function seedAll() {
  for (const item of DEFAULTS) {
    await createCategory(item);
  }
}

// GET: seeds the design set if DB empty.
// GET ?reset=1: archives every existing category, then seeds the design set.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reset = searchParams.get("reset") === "1";

  if (reset) {
    const all = await getAllCategoriesRaw();
    let archived = 0;
    for (const c of all) {
      if (!c.archived) {
        await updateCategory(c.id, { archived: true });
        archived++;
      }
    }
    await seedAll();
    return NextResponse.json({ reset: true, archived, seeded: DEFAULTS.length });
  }

  const existing = await getCategories();
  if (existing.length > 0) {
    return NextResponse.json({ seeded: false, count: existing.length });
  }
  await seedAll();
  return NextResponse.json({ seeded: true, count: DEFAULTS.length });
}
