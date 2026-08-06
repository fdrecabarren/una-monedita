"use client";

import { useMemo, useState } from "react";
import { useStore, type UISub, type TxType } from "./store";
import { CatBubble, Icon } from "./Icon";
import { fmt } from "@/lib/format";
import { monthlyEquivalent, todayISO } from "@/lib/recurrence";
import { SubEditor, type EditTarget } from "./modal-recurrente";

const FREQ_LABEL: Record<string, string> = {
  Diaria: "Diaria", Semanal: "Semanal", Mensual: "Mensual", Bimestral: "Bimestral",
  Trimestral: "Trimestral", Semestral: "Semestral", Anual: "Anual", Personalizada: "Personalizada",
};

// Human date label relative to today: Vencido / Hoy / Mañana / En N días / 14 ago.
function dueLabel(dateISO: string, today: string): string {
  if (dateISO < today) return "Vencido";
  if (dateISO === today) return "Hoy";
  const [y, m, d] = dateISO.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const diff = Math.round((new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) / 86_400_000);
  if (diff === 1) return "Mañana";
  if (diff <= 6) return `En ${diff} días`;
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function SubCard({
  sub,
  onEdit,
  onPay,
  busy,
}: {
  sub: UISub;
  onEdit: () => void;
  onPay: () => void;
  busy: boolean;
}) {
  const { byId } = useStore();
  const cat = sub.cat ? byId[sub.cat] : null;
  const today = todayISO();
  const due = sub.nextChargeDate;
  const overdue = !!due && due < today;
  const paused = sub.status === "Pausada";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 16,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-card)",
        opacity: paused ? 0.65 : 1,
      }}
    >
      <button
        onClick={onEdit}
        style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: 0 }}
      >
        <CatBubble icon={cat?.icon || "Repeat"} color={cat?.color || "#9aa0a6"} size={46} stroke={2} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sub.name}
          </div>
          <div style={{ fontSize: 12.5, color: overdue ? "var(--red)" : "var(--text-3)", fontWeight: 600, marginTop: 2 }}>
            {FREQ_LABEL[sub.frequency] ?? sub.frequency}
            {sub.dueDay ? ` · día ${sub.dueDay}` : ""}
            {due && !paused ? ` · ${dueLabel(due, today)}` : ""}
            {paused ? " · Pausado" : ""}
          </div>
        </div>
        <div className="num tnum" style={{ fontWeight: 700, fontSize: 15, color: sub.type === "income" ? "var(--green)" : "var(--text)", flex: "0 0 auto" }}>
          {fmt(sub.amount, sub.currency)}
        </div>
      </button>
      {sub.status === "Activa" && (
        <button
          onClick={onPay}
          disabled={busy}
          className="icon-btn"
          title="Pagar ahora"
          style={{ width: 40, height: 40, borderRadius: 12, background: "var(--green-soft)", flex: "0 0 auto" }}
        >
          <Icon name="Check" size={19} stroke={2.4} color="var(--green-700)" />
        </button>
      )}
    </div>
  );
}

function Section({ title, subs, onEdit, onPay, busyId }: {
  title: string;
  subs: UISub[];
  onEdit: (s: UISub) => void;
  onPay: (s: UISub) => void;
  busyId: string | null;
}) {
  if (subs.length === 0) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-3)", margin: "0 4px 12px" }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {subs.map((s) => (
          <SubCard key={s.id} sub={s} onEdit={() => onEdit(s)} onPay={() => onPay(s)} busy={busyId === s.id} />
        ))}
      </div>
    </div>
  );
}

export function Recurrentes() {
  const { subscriptions, paySubscription, currency } = useStore();
  const [editing, setEditing] = useState<EditTarget>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [newType, setNewType] = useState<TxType>("expense");

  const today = todayISO();

  const { porPagar, proximos, pausadas } = useMemo(() => {
    const activas = subscriptions.filter((s) => s.status === "Activa");
    const porPagar: UISub[] = [];
    const proximos: UISub[] = [];
    for (const s of activas) {
      const due = s.nextChargeDate;
      if (due && due <= today) porPagar.push(s);
      else if (due && due <= addDaysISO(today, s.alertDaysBefore)) porPagar.push(s);
      else proximos.push(s);
    }
    const byDue = (a: UISub, b: UISub) => (a.nextChargeDate ?? "").localeCompare(b.nextChargeDate ?? "");
    porPagar.sort(byDue);
    proximos.sort(byDue);
    const pausadas = subscriptions.filter((s) => s.status === "Pausada");
    return { porPagar, proximos, pausadas };
  }, [subscriptions, today]);

  const monthlyTotal = useMemo(() => {
    return subscriptions
      .filter((s) => s.status === "Activa" && s.type === "expense")
      .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s), 0);
  }, [subscriptions]);

  async function handlePay(s: UISub) {
    if (payingId) return;
    setPayingId(s.id);
    try {
      await paySubscription(s.id);
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "8px 16px 24px" }}>
      <div style={{ padding: "10px 4px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          Estimado mensual en fijos
        </div>
        <div className="num" style={{ fontSize: 30, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>
          {fmt(monthlyTotal, currency)}
        </div>
      </div>

      <Section title="Por pagar" subs={porPagar} onEdit={setEditing} onPay={handlePay} busyId={payingId} />
      <Section title="Próximos" subs={proximos} onEdit={setEditing} onPay={handlePay} busyId={payingId} />
      <Section title="Pausados" subs={pausadas} onEdit={setEditing} onPay={handlePay} busyId={payingId} />

      {subscriptions.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", gap: 14, textAlign: "center" }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--bg-2)", color: "var(--text-3)" }}>
            <Icon name="Repeat" size={34} stroke={1.8} color="var(--text-3)" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Sin gastos fijos</div>
          <div style={{ color: "var(--text-2)", fontSize: 14.5, maxWidth: 300, lineHeight: 1.5 }}>
            Registrá el gym, suscripciones o dominios y dejá que se avisen o se registren solos.
          </div>
        </div>
      )}

      <button
        onClick={() => setEditing({ type: newType })}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", padding: "13px", marginTop: 6, borderRadius: 14, border: "1.5px dashed var(--line-strong)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14.5, color: "var(--text-2)" }}
      >
        <Icon name="Plus" size={19} stroke={2.4} color="var(--text-2)" /> Nuevo fijo
      </button>

      {editing && <SubEditor initial={editing} onClose={() => setEditing(null)} onTypeHint={setNewType} />}
    </div>
  );
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
