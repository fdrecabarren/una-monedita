"use client";

import { useStore } from "./store";
import { CatBubble } from "./Icon";
import { Donut } from "./Donut";
import { PeriodPills, MonthTabs, MonthNav, CenterBalance, ActionButton, StateView } from "./ui";
import { fmt, fmtShort } from "@/lib/format";

function Ring({ size, donutSize, thickness }: { size: number; donutSize: number; thickness: number }) {
  const { breakdown } = useStore();
  const ring = breakdown.slice(0, 8);
  const R = size / 2 - 30;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      {ring.map((b, i) => {
        const ang = ((-90 + i * (360 / Math.max(ring.length, 1))) * Math.PI) / 180;
        const x = size / 2 + R * Math.cos(ang);
        const y = size / 2 + R * Math.sin(ang);
        return (
          <div key={b.cat} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", textAlign: "center" }}>
            <CatBubble icon={b.icon} color={b.color} size={46} stroke={2} title={b.name} />
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--text-2)", marginTop: 3 }}>{Math.round(b.pct * 100)}%</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <Donut segments={breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }))} size={donutSize} thickness={thickness}>
          <CenterBalance scale={0.92} />
        </Donut>
      </div>
    </div>
  );
}

export function LegendList({ limit = 99, compact = false }: { limit?: number; compact?: boolean }) {
  const { breakdown, setScreen } = useStore();
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {breakdown.slice(0, limit).map((b) => (
        <button
          key={b.cat}
          onClick={() => setScreen("movimientos")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: compact ? "7px 6px" : "10px 6px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            width: "100%",
          }}
        >
          <CatBubble icon={b.icon} color={b.color} size={compact ? 34 : 40} stroke={2} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{b.name}</span>
              <span className="num tnum" style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{fmt(b.total)}</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden" }}>
              <div style={{ width: b.pct * 100 + "%", height: "100%", borderRadius: 999, background: b.color }} />
            </div>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--text-3)", width: 32, textAlign: "right" }}>{Math.round(b.pct * 100)}%</span>
        </button>
      ))}
    </div>
  );
}

function SaldoBar() {
  const { totals, openEntry } = useStore();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 26px 16px" }}>
      <ActionButton kind="expense" onClick={() => openEntry("expense")} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>Saldo</div>
        <div className="num" style={{ fontSize: 21, fontWeight: 600, color: "var(--text)" }}>{fmt(totals.balance)}</div>
      </div>
      <ActionButton kind="income" onClick={() => openEntry("income")} />
    </div>
  );
}

export function DashboardMobile() {
  const { dashStyle, sim, setSim, breakdown } = useStore();
  let body;
  if (sim === "loading") body = <StateView kind="loading" />;
  else if (sim === "error") body = <StateView kind="error" onRetry={() => setSim("normal")} />;
  else if (sim === "empty" || breakdown.length === 0) body = <StateView kind="empty" />;
  else if (dashStyle === "A") {
    body = (
      <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
        <Ring size={332} donutSize={196} thickness={22} />
      </div>
    );
  } else if (dashStyle === "B") {
    body = (
      <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ display: "grid", placeItems: "center", padding: "6px 0 12px" }}>
          <Donut segments={breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }))} size={188} thickness={20}>
            <CenterBalance scale={0.9} />
          </Donut>
        </div>
        <div style={{ padding: "0 18px 12px" }}>
          <LegendList limit={8} />
        </div>
      </div>
    );
  } else {
    body = (
      <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ display: "grid", placeItems: "center", padding: "2px 0 10px" }}>
          <Donut segments={breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }))} size={176} thickness={19}>
            <CenterBalance scale={0.86} />
          </Donut>
        </div>
        <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {breakdown.slice(0, 8).map((b) => (
            <div key={b.cat} style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--surface)", borderRadius: 14, padding: "9px 11px", boxShadow: "var(--shadow-card)" }}>
              <CatBubble icon={b.icon} color={b.color} size={34} stroke={2} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                <div className="num tnum" style={{ fontSize: 11.5, color: "var(--text-3)", fontWeight: 600 }}>{Math.round(b.pct * 100)}% · {fmtShort(b.total)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "6px 18px 10px", display: "flex", flexDirection: "column", gap: 12, flex: "0 0 auto" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><PeriodPills /></div>
        <MonthTabs />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{body}</div>
      {sim === "normal" && breakdown.length > 0 && (
        <div style={{ borderTop: "1px solid var(--line)", background: "var(--surface)", flex: "0 0 auto" }}>
          <SaldoBar />
        </div>
      )}
    </div>
  );
}

export function DashboardDesktop() {
  const { breakdown, sim, setSim } = useStore();
  let center;
  if (sim === "loading") center = <StateView kind="loading" />;
  else if (sim === "error") center = <StateView kind="error" onRetry={() => setSim("normal")} />;
  else if (sim === "empty" || breakdown.length === 0) center = <StateView kind="empty" />;
  else
    center = (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 56, flexWrap: "wrap", height: "100%" }}>
        <Donut segments={breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }))} size={300} thickness={32}>
          <CenterBalance scale={1.28} />
        </Donut>
        <div style={{ width: 280, maxWidth: "40vw" }}>
          <LegendList limit={8} />
        </div>
      </div>
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "26px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <MonthNav center={false} />
        <PeriodPills />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{center}</div>
    </div>
  );
}
