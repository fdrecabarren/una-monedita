"use client";

import { useState } from "react";
import { useStore, type UICategory, type TxType } from "./store";
import { CatBubble, Icon } from "./Icon";
import { Segmented } from "./ui";
import { IconStoreModal } from "./modal-icon-store";

type EditTarget = UICategory | { type: TxType } | null;

function CategoryEditor({ initial, onClose }: { initial: NonNullable<EditTarget>; onClose: () => void }) {
  const { addCategory, updateCategory, deleteCategory } = useStore();
  const existing = "id" in initial ? initial : null;
  const isNew = !existing;
  const [name, setName] = useState(existing?.name || "");
  const [type, setType] = useState<TxType>(initial.type || "expense");
  const [icon, setIcon] = useState(existing?.icon || "Tag");
  const [color, setColor] = useState(existing?.color || "#2fa86a");
  const [storeOpen, setStoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const payload = { name: name.trim() || "Sin nombre", type, icon, color };
      if (existing) await updateCategory(existing.id, payload);
      else await addCategory(payload);
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
    <div className="um-modal-scrim" onClick={onClose}>
      <div className="um-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "var(--font-serif)" }}>{isNew ? "Nueva categoría" : "Editar categoría"}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="X" size={22} stroke={2.2} color="var(--text-2)" />
          </button>
        </div>

        <div style={{ padding: "8px 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => setStoreOpen(true)}
              title="Elegir icono"
              style={{ width: 64, height: 64, borderRadius: "50%", flex: "0 0 auto", cursor: "pointer", display: "grid", placeItems: "center", background: `color-mix(in srgb, ${color} 16%, var(--surface))`, border: `2px solid ${color}`, position: "relative" }}
            >
              <Icon name={icon} size={30} stroke={2} color={color} />
              <span style={{ position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: "50%", background: "var(--green)", display: "grid", placeItems: "center", border: "2px solid var(--surface)" }}>
                <Icon name="Pencil" size={12} stroke={2.6} color="#fff" />
              </span>
            </button>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la categoría"
              style={{ flex: 1, border: "1px solid var(--line)", background: "var(--bg-2)", borderRadius: 12, padding: "13px 15px", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "var(--text)", outline: "none" }}
            />
          </div>

          <button
            onClick={() => setStoreOpen(true)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "11px", borderRadius: 12, border: "1px dashed var(--line-strong)", background: "var(--bg-2)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14, color: "var(--text-2)" }}
          >
            <Icon name="Store" size={18} stroke={2} color="var(--text-2)" /> Elegir icono de la tienda
          </button>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>Tipo</div>
            <Segmented value={type} onChange={setType} options={[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }]} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {existing && (
              <button onClick={remove} disabled={busy} className="icon-btn" style={{ width: 48, height: 48, borderRadius: 12, background: "var(--red-soft)", flex: "0 0 auto" }} aria-label="Eliminar">
                <Icon name="Trash2" size={20} stroke={2} color="var(--red-600)" />
              </button>
            )}
            <button
              onClick={save}
              disabled={busy}
              style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", background: "var(--green)", color: "var(--on-accent)", fontWeight: 800, fontSize: 15, opacity: busy ? 0.7 : 1 }}
            >
              {isNew ? "Crear categoría" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
      <IconStoreModal
        open={storeOpen}
        value={{ icon, color }}
        onPick={(ic) => { setIcon(ic); setStoreOpen(false); }}
        onPickColor={(c) => setColor(c)}
        onClose={() => setStoreOpen(false)}
      />
    </div>
  );
}

function CatCard({ cat, onClick }: { cat: UICategory; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="cat-card"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, padding: "16px 8px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--line)", cursor: "pointer", fontFamily: "inherit", boxShadow: "var(--shadow-card)" }}
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
