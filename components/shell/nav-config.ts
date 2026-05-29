import {
  SquaresFour,
  ArrowsLeftRight,
  Wallet,
  Target,
  ArrowsClockwise,
  ChartBar,
  Gear,
} from "@phosphor-icons/react"
import type { Icon as PhosphorIcon } from "@phosphor-icons/react"

export interface NavItem {
  label: string
  href: string
  icon: PhosphorIcon
}

export const navItems: NavItem[] = [
  { label: "Inicio",          href: "/dashboard",      icon: SquaresFour },
  { label: "Transacciones",   href: "/transacciones",  icon: ArrowsLeftRight },
  { label: "Cuentas",         href: "/cuentas",        icon: Wallet },
  { label: "Presupuestos",    href: "/presupuestos",   icon: Target },
  { label: "Suscripciones",   href: "/suscripciones",  icon: ArrowsClockwise },
  { label: "Reportes",        href: "/reportes",       icon: ChartBar },
  { label: "Ajustes",         href: "/ajustes",        icon: Gear },
]

// Bottom nav: 4 items flanking the FAB
export const bottomNavItems: NavItem[] = [
  navItems[0], // Inicio
  navItems[1], // Transacciones
  navItems[5], // Reportes
  navItems[6], // Ajustes
]
