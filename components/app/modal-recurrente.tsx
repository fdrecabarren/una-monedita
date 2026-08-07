"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useStore, type UISub, type TxType, type NewSubInput } from "./store";
import { CatBubble, Icon } from "./Icon";
import { Segmented } from "./ui";
import { firstChargeDate } from "@/lib/recurrence";
import type { Frequency } from "@/lib/notion/schemas";

export type EditTarget = UISub | { type: TxType } | null;

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "Mensual", label: "Mensual" },
  { value: "Trimestral", label: "Trimestral" },
  { value: "Semestral", label: "Semestral" },
  { value: "Anual", label: "Anual" },
  { value: "Semanal", label: "Semanal" },
  { value: "Diaria", label: "Diaria" },
  { value: "Bimestral", label: "Bimestral" },
  { value: "Personalizada", label: "Personalizada" },
];

const HAS_DUE_DAY: Frequency[] = ["Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"];

function FreqPills({ value, onChange }: { value: Frequency; onChange: (v: Frequency) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {FREQ_OPTIONS.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: on ? "1.5px solid var(--green)" : "1.5px solid var(--line)",
              background: on ? "var(--green-soft)" : "var(--surface)",
              color: on ? "var(--green-700)" : "var(--text-2)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  background: "var(--bg-2)",
  borderRadius: 12,
  padding: "12px 14px",
  fontFamily: "inherit",
  fontSize: 16,
  fontWeight: 700,
  color: "var(--text)",
  outline: "none",
};

export function SubEditor({
  initial,
  onClose,
  onTypeHint,
}: {
  initial: NonNullable<EditTarget>;
  onClose: () => void;
  onTypeHint?: (t: TxType) => void;
}) {
  const { categories, currency: appCurrency, addSubscription, updateSubscription, deleteSubscription } = useStore();
  const existing = "id" in initial ? initial : null;
  const isNew = !existing;

  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<TxType>(existing?.type ?? initial.type ?? "expense");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [catId, setCatId] = useState<string | null>(existing?.cat ?? null);
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? "Mensual");
  const [customIntervalDays, setCustomIntervalDays] = useState(existing?.customIntervalDays ? String(existing.customIntervalDays) : "30");
  const [dueDay, setDueDay] = useState(existing?.dueDay ? String(existing.dueDay) : "");
  const [startDate, setStartDate] = useState(existing?.startDate ?? new Date().toISOString().slice(0, 10));
  const [nextChargeDate, setNextChargeDate] = useState(
    existing?.nextChargeDate ??
      firstChargeDate(existing?.startDate ?? new Date().toISOString().slice(0, 10), frequency, undefined, undefined)
  );
  const [alertDaysBefore, setAlertDaysBefore] = useState(existing ? String(existing.alertDaysBefore) : "3");
  const [autoCreate, setAutoCreate] = useState<"on" | "off">(existing?.autoCreate ? "on" : "off");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const cats = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);

  function recalcNextCharge() {
    setNextChargeDate(
      firstChargeDate(
        startDate,
        frequency,
        frequency === "Personalizada" ? Number(customIntervalDays) || 30 : undefined,
        HAS_DUE_DAY.includes(frequency) && dueDay ? Number(dueDay) : undefined
      )
    );
  }

  async function save() {
    if (busy) return;
    const amt = Math.round((parseFloat(amount) || 0) * 100) / 100;
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      const payload: NewSubInput = {
        name: name.trim() || "Sin nombre",
        type,
        amount: amt,
        currency: appCurrency,
        frequency,
        customIntervalDays: frequency === "Personalizada" ? Number(customIntervalDays) || 30 : undefined,
        dueDay: HAS_DUE_DAY.includes(frequency) && dueDay ? Number(dueDay) : undefined,
        startDate,
        nextChargeDate,
        alertDaysBefore: Number(alertDaysBefore) || 0,
        autoCreate: autoCreate === "on",
        cat: catId,
        notes: notes.trim(),
      };
      if (existing) await updateSubscription(existing.id, payload);
      else await addSubscription(payload);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function togglePause() {
    if (!existing || busy) return;
    setBusy(true);
    try {
      await updateSubscription(existing.id, { status: existing.status === "Pausada" ? "Activa" : "Pausada" });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing || busy) return;
    setBusy(true);
    try {
      await deleteSubscription(existing.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="um-modal-scrim" onClick={onClose}>
      <div className="um-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, maxHeight: "94dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flex: "0 0 auto" }}>
          <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "var(--font-serif)" }}>{isNew ? "Nuevo fijo" : "Editar fijo"}</div>
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
            gap: 18,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
          }}
        >
          <Field label="Tipo">
            <Segmented
              value={type}
              onChange={(v) => {
                setType(v);
                setCatId(null);
                onTypeHint?.(v);
              }}
              options={[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }]}
            />
          </Field>

          <Field label="Nombre">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gimnasio, Claude, dominio…" style={inputStyle} />
          </Field>

          <Field label="Monto">
            <input type="number" inputMode="decimal" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
          </Field>

          {cats.length > 0 && (
            <Field label="Categoría">
              <div className="cat-grid">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCatId(c.id)}
                    className="cat-card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "14px 6px",
                      borderRadius: 16,
                      background: catId === c.id ? `color-mix(in srgb, ${c.color} 14%, var(--surface))` : "var(--surface)",
                      border: catId === c.id ? `2px solid ${c.color}` : "1px solid var(--line)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <CatBubble icon={c.icon} color={c.color} size={44} stroke={2} active={catId === c.id} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label="Frecuencia">
            <FreqPills value={frequency} onChange={setFrequency} />
          </Field>

          {frequency === "Personalizada" && (
            <Field label="Cada cuántos días">
              <input type="number" min={1} value={customIntervalDays} onChange={(e) => setCustomIntervalDays(e.target.value)} style={inputStyle} />
            </Field>
          )}

          {HAS_DUE_DAY.includes(frequency) && (
            <Field label="Día del mes (aprox.)">
              <input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="Ej: 14" style={inputStyle} />
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.4 }}>
                Si el mes no tiene ese día (ej. 31 en febrero), se cobra el último día del mes.
              </div>
            </Field>
          )}

          <Field label="Empieza">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Próximo cobro">
            <div style={{ display: "flex", gap: 8 }}>
              <input type="date" value={nextChargeDate} onChange={(e) => setNextChargeDate(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
              <button
                type="button"
                onClick={recalcNextCharge}
                title="Recalcular desde la fecha de inicio"
                className="icon-btn"
                style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-2)", flex: "0 0 auto" }}
              >
                <Icon name="Repeat" size={18} stroke={2.2} color="var(--text-2)" />
              </button>
            </div>
          </Field>

          <Field label="Registro automático">
            <Segmented
              value={autoCreate}
              onChange={setAutoCreate}
              options={[{ value: "on", label: "Automático" }, { value: "off", label: "Confirmar manual" }]}
            />
            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.4 }}>
              {autoCreate === "on"
                ? "Se registra solo en la fecha de cobro."
                : "Aparece en “Por pagar” hasta que confirmes."}
            </div>
          </Field>

          <Field label="Avisar con anticipación (días)">
            <input type="number" min={0} max={30} value={alertDaysBefore} onChange={(e) => setAlertDaysBefore(e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Notas">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" style={inputStyle} />
          </Field>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {existing && (
              <>
                <button
                  onClick={remove}
                  disabled={busy}
                  className="icon-btn"
                  style={{ width: 48, height: 48, borderRadius: 12, background: "var(--red-soft)", flex: "0 0 auto" }}
                  aria-label="Eliminar"
                >
                  <Icon name="Trash2" size={20} stroke={2} color="var(--red-600)" />
                </button>
                <button
                  onClick={togglePause}
                  disabled={busy}
                  className="icon-btn"
                  style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bg-2)", flex: "0 0 auto" }}
                  aria-label={existing.status === "Pausada" ? "Reanudar" : "Pausar"}
                  title={existing.status === "Pausada" ? "Reanudar" : "Pausar"}
                >
                  <Icon name={existing.status === "Pausada" ? "PlayCircle" : "PauseCircle"} size={20} stroke={2} color="var(--text-2)" />
                </button>
              </>
            )}
            <button
              onClick={save}
              disabled={busy}
              style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", background: "var(--green)", color: "var(--on-accent)", fontWeight: 800, fontSize: 15, opacity: busy ? 0.7 : 1 }}
            >
              {isNew ? "Crear fijo" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
