"use client";

import { useState } from "react";
import { useStore, type TxType } from "./store";
import { Icon, CatBubble } from "./Icon";
import { PeriodPills, Segmented } from "./ui";
import { RangeModal } from "./modal-range";
import { EMPTY_TX_FILTER, type TxFilter } from "@/lib/tx-filter";

const TYPE_OPTIONS: { value: "all" | TxType; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "income", label: "Ingresos" },
  { value: "expense", label: "Gastos" },
];

export function FiltrosModal({ onClose }: { onClose: () => void }) {
  const { categories, txFilter, setTxFilter, rangeLabel } = useStore();
  const [draft, setDraft] = useState<TxFilter>(txFilter);
  const [rangeOpen, setRangeOpen] = useState(false);

  const visibleCats = categories.filter((c) => draft.type === "all" || c.type === draft.type);

  function toggleCat(id: string) {
    setDraft((d) => ({
      ...d,
      cats: d.cats.includes(id) ? d.cats.filter((c) => c !== id) : [...d.cats, id],
    }));
  }

  function apply() {
    setTxFilter(draft);
    onClose();
  }

  function clear() {
    setTxFilter(EMPTY_TX_FILTER);
    onClose();
  }

  return (
    <>
      <div className="um-modal-scrim" onClick={onClose}>
        <div className="um-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, maxHeight: "94dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flex: "0 0 auto" }}>
          <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "var(--font-serif)" }}>Filtros</div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="X" size={22} stroke={2.2} color="var(--text-2)" />
          </button>
        </div>

        <div
          className="app-scroll"
          style={{
            padding: "8px 20px calc(20px + env(safe-area-inset-bottom))",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>
              Período
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
              <PeriodPills size="sm" />
              <button
                type="button"
                onClick={() => setRangeOpen(true)}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "var(--text-3)", fontSize: 12.5, fontWeight: 700, padding: "2px 2px" }}
              >
                Rango personalizado… ({rangeLabel})
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>
              Tipo
            </div>
            <Segmented
              options={TYPE_OPTIONS}
              value={draft.type}
              onChange={(v) =>
                setDraft((d) => ({
                  type: v,
                  // al acotar el tipo, se cae cualquier categoría seleccionada que ya no aplique
                  cats: v === "all" ? d.cats : d.cats.filter((id) => categories.find((c) => c.id === id)?.type === v),
                }))
              }
            />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-3)" }}>
                Categorías
              </div>
              {draft.cats.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, cats: [] }))}
                  style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "var(--green-700)", fontSize: 12.5, fontWeight: 800 }}
                >
                  Limpiar selección
                </button>
              )}
            </div>
            {/* Sin ninguna categoría marcada NO se filtra por categoría: se ven
                todas, incluidas las transacciones sin categoría. Marcar "todas"
                una por una no es equivalente — dejaría fuera las sin categoría. */}
            <div className="cat-grid">
              {visibleCats.map((c) => {
                const on = draft.cats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    className="cat-card"
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "14px 6px",
                      borderRadius: 16,
                      background: on ? `color-mix(in srgb, ${c.color} 14%, var(--surface))` : "var(--surface)",
                      border: on ? `2px solid ${c.color}` : "1px solid var(--line)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {on && (
                      <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: c.color, display: "grid", placeItems: "center" }}>
                        <Icon name="Check" size={12} stroke={3} color="#fff" />
                      </div>
                    )}
                    <CatBubble icon={c.icon} color={c.color} size={44} stroke={2} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textAlign: "center" }}>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={clear}
              style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1.5px solid var(--line)", cursor: "pointer", fontFamily: "inherit", background: "var(--surface)", color: "var(--text-2)", fontWeight: 800, fontSize: 15 }}
            >
              Limpiar filtros
            </button>
            <button
              onClick={apply}
              style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit", background: "var(--green)", color: "var(--on-accent)", fontWeight: 800, fontSize: 15 }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
    {rangeOpen && <RangeModal onClose={() => setRangeOpen(false)} />}
    </>
  );
}
