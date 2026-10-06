"use client";

import { useMemo, useState } from "react";
import { useStore, type UISub, type TxType } from "./store";
import { CatBubble, Icon } from "./Icon";
import { fmt, fmtDayMonth } from "@/lib/format";
import { monthlyEquivalent, todayISO } from "@/lib/recurrence";
import { SubEditor, type EditTarget } from "./modal-recurrente";

type Tone = "late" | "due" | "paid" | "idle";

// Estado de un fijo derivado solo de sus fechas (no hay nada automático):
// - vence hoy o ya venció            → "Pendiente"
// - ya se registró el período actual → "Pagado <fecha del último pago>"
// - todavía no le toca               → "Próximo <vencimiento>"
function statusOf(sub: UISub, today: string): { label: string; tone: Tone } {
  if (sub.status === "Pausada") return { label: "Pausado", tone: "idle" };
  const next = sub.nextChargeDate?.slice(0, 10) ?? null;
  const last = sub.lastChargedDate?.slice(0, 10) ?? null;
  if (next && next <= today) return { label: `Pendiente · vence ${fmtDayMonth(next)}`, tone: next < today ? "late" : "due" };
  if (last) return { label: `Pagado ${fmtDayMonth(last)}`, tone: "paid" };
  if (next) return { label: `Próximo ${fmtDayMonth(next)}`, tone: "idle" };
  return { label: "Sin pagos", tone: "idle" };
}

const TONE_COLOR: Record<Tone, string> = {
  late: "var(--expense)",
  due: "var(--text-2)",
  paid: "var(--accent-ink)",
  idle: "var(--text-3)",
};

function SubRow({ sub, today, onEdit, onPay }: { sub: UISub; today: string; onEdit: () => void; onPay: () => void }) {
  const { byId } = useStore();
  const cat = sub.cat ? byId[sub.cat] : null;
  const paused = sub.status === "Pausada";
  const st = statusOf(sub, today);
  const paid = st.tone === "paid";
  const freq = sub.frequency !== "Mensual" ? `${sub.frequency} · ` : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px 8px 12px",
        borderRadius: 14,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        opacity: paused ? 0.6 : 1,
      }}
    >
      <button
        onClick={onEdit}
        style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, minWidth: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: 0 }}
      >
        <CatBubble icon={cat?.icon || "Repeat"} color={cat?.color || "#9aa0a6"} size={36} stroke={2} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.name}</div>
          <div style={{ fontSize: 12, color: TONE_COLOR[st.tone], fontWeight: 600, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {freq}
            {st.label}
          </div>
        </div>
        <div className="num tnum" style={{ fontWeight: 600, fontSize: 14.5, color: sub.type === "income" ? "var(--income)" : "var(--text)", flex: "0 0 auto" }}>
          {fmt(sub.amount, sub.currency)}
        </div>
      </button>
      {sub.status === "Activa" && (
        <button
          onClick={onPay}
          className="icon-btn"
          title="Registrar pago"
          aria-label="Registrar pago"
          style={{ width: 44, height: 44, borderRadius: 12, background: paid ? "var(--bg-2)" : "var(--accent-soft)", flex: "0 0 auto" }}
        >
          <Icon name="Check" size={18} stroke={2.4} color={paid ? "var(--text-3)" : "var(--accent-ink)"} />
        </button>
      )}
    </div>
  );
}

export function Recurrentes() {
  const { subscriptions, openConfirmSub, currency } = useStore();
  const [editing, setEditing] = useState<EditTarget>(null);
  const [newType, setNewType] = useState<TxType>("expense");

  const today = todayISO();

  // Una sola lista: activos por próximo vencimiento, pausados al final.
  // Los cancelados no se muestran.
  const { list, activas, pagados } = useMemo(() => {
    const byDue = (a: UISub, b: UISub) => (a.nextChargeDate ?? "").localeCompare(b.nextChargeDate ?? "");
    const activas = subscriptions.filter((s) => s.status === "Activa").sort(byDue);
    const pausadas = subscriptions.filter((s) => s.status === "Pausada").sort((a, b) => a.name.localeCompare(b.name, "es"));
    const pagados = activas.filter((s) => statusOf(s, today).tone === "paid").length;
    return { list: [...activas, ...pausadas], activas, pagados };
  }, [subscriptions, today]);

  const monthlyTotal = useMemo(
    () => activas.filter((s) => s.type === "expense").reduce((sum, s) => sum + monthlyEquivalent(s.amount, s), 0),
    [activas]
  );

  const allPaid = activas.length > 0 && pagados === activas.length;

  return (
    <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "8px 16px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 4px 16px" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-2)" }}>Gastos fijos por mes</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 600, color: "var(--text)", marginTop: 2 }}>
            ≈ {fmt(monthlyTotal, currency)}
          </div>
        </div>
        {activas.length > 0 && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              background: allPaid ? "var(--accent-soft)" : "var(--bg-2)",
              color: allPaid ? "var(--accent-ink)" : "var(--text-2)",
              flex: "0 0 auto",
            }}
          >
            {pagados}/{activas.length} pagados
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((s) => (
            <SubRow key={s.id} sub={s} today={today} onEdit={() => setEditing(s)} onPay={() => openConfirmSub(s)} />
          ))}
        </div>
      )}

      {subscriptions.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", gap: 14, textAlign: "center" }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--bg-2)", color: "var(--text-3)" }}>
            <Icon name="Repeat" size={34} stroke={1.8} color="var(--text-3)" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Sin gastos fijos</div>
          <div style={{ color: "var(--text-2)", fontSize: 14.5, maxWidth: 300, lineHeight: 1.5 }}>
            Agregá tus gastos fijos (alquiler, gimnasio, suscripciones) y registrá cada pago el día que lo hagas.
          </div>
        </div>
      )}

      <button
        onClick={() => setEditing({ type: newType })}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", padding: "13px", marginTop: 14, borderRadius: 14, border: "1.5px dashed var(--line-strong)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14.5, color: "var(--text-2)" }}
      >
        <Icon name="Plus" size={19} stroke={2.4} color="var(--text-2)" /> Nuevo fijo
      </button>

      {editing && <SubEditor initial={editing} onClose={() => setEditing(null)} onTypeHint={setNewType} />}
    </div>
  );
}
