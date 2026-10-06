"use client";

import { useState } from "react";
import { useStore, type UICategory, type TxType } from "./store";
import { CatBubble, Icon } from "./Icon";
import { Segmented } from "./ui";
import { Sheet, SheetHeader, ConfirmRow } from "./Sheet";
import { IconStoreModal } from "./modal-icon-store";

type EditTarget = UICategory | { type: TxType } | null;

function CategoryEditor({ initial, onClose }: { initial: NonNullable<EditTarget>; onClose: () => void }) {
  const { addCategory, updateCategory, deleteCategory, budgets, setBudget, currency: appCurrency } = useStore();
  const existing = "id" in initial ? initial : null;
  const isNew = !existing;
  const [name, setName] = useState(existing?.name || "");
  const [type, setType] = useState<TxType>(initial.type || "expense");
  const [icon, setIcon] = useState(existing?.icon || "Tag");
  const [color, setColor] = useState(existing?.color || "#2fa86a");
  const [storeOpen, setStoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const existingBudget = existing ? budgets.find((b) => b.categoryId === existing.id) : undefined;
  const [budgetLimit, setBudgetLimit] = useState(existingBudget ? String(existingBudget.limit) : "");

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const payload = { name: name.trim() || "Sin nombre", type, icon, color };
      let catId: string;
      if (existing) {
        await updateCategory(existing.id, payload);
        catId = existing.id;
      } else {
        catId = await addCategory(payload);
      }
      if (type === "expense") {
        const lim = Math.round((parseFloat(budgetLimit) || 0) * 100) / 100;
        if (lim > 0) await setBudget(catId, lim);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing || busy) return;
    setBusy(true);
    try {
      await deleteCategory(existing.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet label={isNew ? "Nueva categoría" : "Editar categoría"} onClose={onClose}>
        <SheetHeader title={isNew ? "Nueva categoría" : "Editar categoría"} onClose={onClose} />

        <div style={{ padding: "8px 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => setStoreOpen(true)}
              title="Elegir icono"
              style={{ width: 64, height: 64, borderRadius: "50%", flex: "0 0 auto", cursor: "pointer", display: "grid", placeItems: "center", background: `color-mix(in srgb, ${color} 16%, var(--surface))`, border: `2px solid ${color}`, position: "relative" }}
            >
              <Icon name={icon} size={30} stroke={2} color={color} />
              <span style={{ position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", display: "grid", placeItems: "center", border: "2px solid var(--surface)" }}>
                <Icon name="Pencil" size={12} stroke={2.6} color="var(--on-accent)" />
              </span>
            </button>
            <input
              data-autofocus
              aria-label="Nombre de la categoría"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la categoría"
              style={{ flex: 1, border: "1px solid var(--line)", background: "var(--bg-2)", borderRadius: 12, padding: "13px 15px", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "var(--text)" }}
            />
          </div>

          <button
            onClick={() => setStoreOpen(true)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "11px", borderRadius: 12, border: "1px dashed var(--line-strong)", background: "var(--bg-2)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14, color: "var(--text-2)" }}
          >
            <Icon name="Store" size={18} stroke={2} color="var(--text-2)" /> Elegir icono de la tienda
          </button>

          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Tipo</div>
            <Segmented label="Tipo de categoría" value={type} onChange={setType} options={[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }]} />
          </div>

          {type === "expense" && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Presupuesto mensual (opcional)
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder={`Sin límite (${appCurrency})`}
                style={{ width: "100%", border: "1px solid var(--line)", background: "var(--bg-2)", borderRadius: 12, padding: "12px 14px", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "var(--text)" }}
              />
              <div className="caption" style={{ marginTop: 6 }}>
                Se compara contra el gasto real del mes en el Resumen.
              </div>
            </div>
          )}

          {confirmDelete ? (
            <ConfirmRow
              question="¿Eliminar esta categoría?"
              detail="Los movimientos que ya la usan se conservan."
              busy={busy}
              onCancel={() => setConfirmDelete(false)}
              onConfirm={remove}
            />
          ) : (
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {existing && (
              <button onClick={() => setConfirmDelete(true)} disabled={busy} className="icon-btn" style={{ width: 48, height: 48, borderRadius: 12, background: "var(--expense-soft)", flex: "0 0 auto" }} aria-label="Eliminar">
                <Icon name="Trash2" size={20} stroke={2} color="var(--expense)" />
              </button>
            )}
            <button
              onClick={save}
              disabled={busy}
              style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 800, fontSize: 15, opacity: busy ? 0.7 : 1 }}
            >
              {isNew ? "Crear categoría" : "Guardar cambios"}
            </button>
          </div>
          )}
        </div>
      </Sheet>
      <IconStoreModal
        open={storeOpen}
        value={{ icon, color }}
        onPick={(ic) => { setIcon(ic); setStoreOpen(false); }}
        onPickColor={(c) => setColor(c)}
        onClose={() => setStoreOpen(false)}
      />
    </>
  );
}

function CatCard({ cat, onClick }: { cat: UICategory; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="cat-card"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, padding: "16px 8px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--line)", cursor: "pointer", fontFamily: "inherit" }}
    >
      <CatBubble icon={cat.icon} color={cat.color} size={52} stroke={2} />
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{cat.name}</div>
    </button>
  );
}

function Section({
  title,
  items,
  onEdit,
  onNew,
}: {
  title: string;
  items: UICategory[];
  onEdit: (c: UICategory) => void;
  onNew: (type: TxType) => void;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-3)", margin: "0 4px 12px" }}>{title}</div>
      <div className="cat-grid">
        {items.map((c) => (
          <CatCard key={c.id} cat={c} onClick={() => onEdit(c)} />
        ))}
        <button
          onClick={() => onNew(title === "Ingresos" ? "income" : "expense")}
          className="cat-card"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, padding: "16px 8px", borderRadius: 16, background: "transparent", border: "1.5px dashed var(--line-strong)", cursor: "pointer", fontFamily: "inherit" }}
        >
          <div style={{ width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--bg-2)" }}>
            <Icon name="Plus" size={26} stroke={2.4} color="var(--text-3)" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-3)" }}>Nueva</div>
        </button>
      </div>
    </div>
  );
}

export function Categorias() {
  const { categories } = useStore();
  const [editing, setEditing] = useState<EditTarget>(null);

  const expenses = categories.filter((c) => c.type === "expense");
  const incomes = categories.filter((c) => c.type === "income");

  return (
    <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "8px 16px 24px" }}>
      <Section title="Gastos" items={expenses} onEdit={setEditing} onNew={(type) => setEditing({ type })} />
      <Section title="Ingresos" items={incomes} onEdit={setEditing} onNew={(type) => setEditing({ type })} />
      {editing && <CategoryEditor initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
