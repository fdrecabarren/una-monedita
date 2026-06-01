"use client";

import { useState, useMemo } from "react";
import { Icon } from "./Icon";
import { GROUPS, COLORS, ALL } from "@/lib/icon-catalog";

export function IconStoreModal({
  open,
  value,
  onPick,
  onPickColor,
  onClose,
}: {
  open: boolean;
  value: { icon: string; color: string };
  onPick: (icon: string) => void;
  onPickColor?: (color: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query) return ALL.filter((n) => n.toLowerCase().includes(query));
    if (group === "all") return ALL;
    return GROUPS.find((g) => g.id === group)?.icons ?? ALL;
  }, [q, group]);

  if (!open) return null;

  return (
    <div className="um-modal-scrim" style={{ zIndex: 70 }} onClick={onClose}>
      <div
        className="um-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, display: "flex", flexDirection: "column", maxHeight: "92vh" }}
      >
        <div style={{ padding: "14px 18px 8px", display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>
          <div style={{ fontWeight: 800, fontSize: 17, fontFamily: "var(--font-serif)", flex: 1 }}>Tienda de iconos</div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="X" size={22} stroke={2.2} color="var(--text-2)" />
          </button>
        </div>

        {/* search */}
        <div style={{ padding: "0 18px 10px", flex: "0 0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line)" }}>
            <Icon name="Search" size={17} stroke={2} color="var(--text-3)" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar icono…"
              style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "var(--text)" }}
            />
          </div>
        </div>

        {/* color palette */}
        {onPickColor && (
          <div style={{ padding: "0 18px 10px", display: "flex", gap: 8, flexWrap: "wrap", flex: "0 0 auto" }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onPickColor(c)}
                aria-label={"Color " + c}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: c,
                  border: value.color === c ? "2.5px solid var(--text)" : "2px solid var(--surface)",
                  boxShadow: "0 0 0 1px var(--line)",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        )}

        {/* group tabs */}
        {!q.trim() && (
          <div className="app-scroll" style={{ padding: "0 18px 8px", display: "flex", gap: 6, overflowX: "auto", flex: "0 0 auto" }}>
            {[{ id: "all", name: "Todos" }, ...GROUPS].map((g) => {
              const on = group === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGroup(g.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    fontSize: 12.5,
                    whiteSpace: "nowrap",
                    color: on ? "var(--on-accent)" : "var(--text-2)",
                    background: on ? "var(--green)" : "var(--bg-2)",
                  }}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        )}

        {/* icon grid */}
        <div className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 18px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(54px, 1fr))", gap: 8 }}>
            {list.map((name) => {
              const on = value.icon === name;
              return (
                <button
                  key={name}
                  onClick={() => onPick(name)}
                  className="icon-tile"
                  title={name}
                  style={{
                    aspectRatio: "1 / 1",
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: on ? `color-mix(in srgb, ${value.color} 16%, var(--surface))` : "var(--surface)",
                    border: on ? `2px solid ${value.color}` : "1px solid var(--line)",
                  }}
                >
                  <Icon name={name} size={22} stroke={2} color={on ? value.color : "var(--text-2)"} />
                </button>
              );
            })}
          </div>
          {list.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 14, padding: "24px 0" }}>Sin resultados</div>
          )}
        </div>
      </div>
    </div>
  );
}
