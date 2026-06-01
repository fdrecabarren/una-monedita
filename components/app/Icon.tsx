"use client";

import type { CSSProperties } from "react";
import { ICONS, FALLBACK_ICON } from "@/lib/icon-registry";

export function Icon({
  name,
  size = 24,
  stroke = 2,
  color = "currentColor",
  className,
  style,
}: {
  name: string;
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const Cmp = ICONS[name] || FALLBACK_ICON;
  return (
    <Cmp
      size={size}
      strokeWidth={stroke}
      color={color}
      className={className}
      style={style}
      aria-hidden
    />
  );
}

export function CatBubble({
  icon,
  color,
  size = 44,
  stroke = 2,
  active = false,
  onClick,
  title,
}: {
  icon: string;
  color: string;
  size?: number;
  stroke?: number;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const s: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    background: `color-mix(in srgb, ${color} 16%, var(--surface))`,
    border: `1.5px solid color-mix(in srgb, ${color} ${active ? 70 : 38}%, transparent)`,
    color,
    cursor: onClick ? "pointer" : "default",
    transition: "transform .15s ease, border-color .15s, background .15s",
  };
  return (
    <div
      role={onClick ? "button" : undefined}
      title={title}
      onClick={onClick}
      style={s}
      className="cat-bubble"
    >
      <Icon name={icon} size={Math.round(size * 0.48)} stroke={stroke} color={color} />
    </div>
  );
}
