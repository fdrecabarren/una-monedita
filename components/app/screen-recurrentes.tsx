"use client";

import { useMemo, useState } from "react";
import { useStore, type UISub, type TxType } from "./store";
import { CatBubble, Icon } from "./Icon";
import { fmt, fmtDayMonth } from "@/lib/format";
import { monthlyEquivalent, monthStatus, monthCounter, type SubMonthKind } from "@/lib/recurrence";
import { SubEditor, type EditTarget } from "./modal-recurrente";
import { MONTHS_FULL } from "./ui";

const TONE_COLOR: Record<SubMonthKind, string> = {
  late: "var(--expense)",
  today: "var(--text-2)",
  pending: "var(--text-2)",
  paid: "var(--accent-ink)",
  later: "var(--text-3)",
  none: "var(--text-3)",
  paused: "var(--text-3)",
};

// Estado de un fijo en el MES actual (ver monthStatus en lib/recurrence): el
// contador y las filas arrancan de cero al cambiar de mes porque se calculan
// contra el mes calendario, no contra "alguna vez se pagó".
function statusOf(sub: UISub, today: string): { label: string; kind: SubMonthKind } {
  const st = monthStatus(sub, today);
  const d = st.date ? fmtDayMonth(st.date) : "";
  switch (st.kind) {
    case "late":
      return { label: `Pendiente · venció ${d}`, kind: st.kind };
    case "today":
      return { label: "Pendiente · vence hoy", kind: st.kind };
    case "pending":
      return { label: `Vence ${d}`, kind: st.kind };
    case "paid":
      return { label: `${sub.type === "income" ? "Cobrado" : "Pagado"} ${d}`, kind: st.kind };
    case "later":
      return { label: `Próximo ${d}`, kind: st.kind };
    case "paused":
      return { label: "Pausado", kind: st.kind };
    default:
      return { label: "Sin fecha", kind: st.kind };
  }
}

function SubRow({ sub, today, onEdit, onPay }: { sub: UISub; today: string; onEdit: () => void; onPay: () => void }) {
  const { byId } = useStore();
  const cat = sub.cat ? byId[sub.cat] : null;
  const paused = sub.status === "Pausada";
  const st = statusOf(sub, today);
  // el ✓ se destaca cuando hay algo para registrar este mes
  const actionable = st.kind === "late" || st.kind === "today" || st.kind === "pending";
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
          <div style={{ fontSize: 12, color: TONE_COLOR[st.kind], fontWeight: 600, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
          style={{ width: 44, height: 44, borderRadius: 12, background: actionable ? "var(--accent-soft)" : "var(--bg-2)", flex: "0 0 auto" }}
        >
          <Icon name="Check" size={18} stroke={2.4} color={actionable ? "var(--accent-ink)" : "var(--text-3)"} />
        </button>
      )}
    </div>
  );
}

export function Recurrentes() {
  const { subscriptions, openConfirmSub, currency, today } = useStore();
  const [editing, setEditing] = useState<EditTarget>(null);
  const [newType, setNewType] = useState<TxType>("expense");


  // Una sola lista: activos por próximo vencimiento, pausados al final.
  // Los cancelados no se muestran.
  const { list, activas } = useMemo(() => {
    const byDue = (a: UISub, b: UISub) => (a.nextChargeDate ?? "").localeCompare(b.nextChargeDate ?? "");
    const activas = subscriptions.filter((s) => s.status === "Activa").sort(byDue);
    const pausadas = subscriptions.filter((s) => s.status === "Pausada").sort((a, b) => a.name.localeCompare(b.name, "es"));
    return { list: [...activas, ...pausadas], activas };
  }, [subscriptions]);

  const { paid: pagados, due } = useMemo(() => monthCounter(subscriptions, today), [subscriptions, today]);
  const monthName = MONTHS_FULL[Number(today.slice(5, 7)) - 1].toLowerCase();

  const monthlyTotal = useMemo(
    () => activas.filter((s) => s.type === "expense").reduce((sum, s) => sum + monthlyEquivalent(s.amount, s), 0),
    [activas]
  );

  const allPaid = due > 0 && pagados === due;

  return (
    <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "8px 16px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 4px 16px" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-2)" }}>Gastos fijos por mes</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 600, color: "var(--text)", marginTop: 2 }}>
            ≈ {fmt(monthlyTotal, currency)}
          </div>
        </div>
        {due > 0 && (
          <div
            title={`Fijos de ${monthName}: ${pagados} de ${due} pagados`}
            aria-label={`Fijos de ${monthName}: ${pagados} de ${due} pagados`}
            role="status"
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
            {pagados}/{due} pagados
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
