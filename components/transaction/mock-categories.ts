export interface Category {
  id: string
  label: string
  emoji: string
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: "comida", label: "Comida", emoji: "🍔" },
  { id: "transporte", label: "Transporte", emoji: "🚌" },
  { id: "entrete", label: "Entrete.", emoji: "🎮" },
  { id: "salud", label: "Salud", emoji: "🏥" },
  { id: "ropa", label: "Ropa", emoji: "👕" },
  { id: "servicios", label: "Servicios", emoji: "💡" },
  { id: "casa", label: "Casa", emoji: "🏠" },
  { id: "otros", label: "Otros", emoji: "📦" },
]

export const INCOME_CATEGORIES: Category[] = [
  { id: "sueldo", label: "Sueldo", emoji: "💼" },
  { id: "freelance", label: "Freelance", emoji: "💻" },
  { id: "inversiones", label: "Inversiones", emoji: "📈" },
  { id: "regalo", label: "Regalo", emoji: "🎁" },
  { id: "reembolso", label: "Reembolso", emoji: "💸" },
  { id: "otros", label: "Otros", emoji: "📦" },
]
