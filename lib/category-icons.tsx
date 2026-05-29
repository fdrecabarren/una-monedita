import {
  ForkKnife,
  Bus,
  GameController,
  FirstAid,
  TShirt,
  Lightbulb,
  House,
  Package,
  Briefcase,
  Laptop,
  TrendUp,
  Gift,
  CurrencyCircleDollar,
  ArrowsLeftRight,
  Question,
} from "@phosphor-icons/react/dist/ssr"

type PhosphorProps = {
  size?: number
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone"
  className?: string
}

interface CategoryIconProps extends PhosphorProps {
  name: string | null | undefined
}

export function CategoryIcon({ name, size = 18, weight = "bold", className }: CategoryIconProps) {
  const key = (name ?? "").toLowerCase().trim()
  const p = { size, weight, className }

  switch (key) {
    case "comida":          return <ForkKnife {...p} />
    case "transporte":      return <Bus {...p} />
    case "entretenimiento": return <GameController {...p} />
    case "salud":           return <FirstAid {...p} />
    case "ropa":            return <TShirt {...p} />
    case "servicios":       return <Lightbulb {...p} />
    case "casa":            return <House {...p} />
    case "sueldo":          return <Briefcase {...p} />
    case "freelance":       return <Laptop {...p} />
    case "inversiones":     return <TrendUp {...p} />
    case "regalo":          return <Gift {...p} />
    case "reembolso":       return <CurrencyCircleDollar {...p} />
    case "transferencia":   return <ArrowsLeftRight {...p} />
    case "otros":           return <Package {...p} />
    default:                return <Question {...p} />
  }
}
