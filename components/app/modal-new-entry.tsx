"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useStore, toISO, type TxType, type UITx } from "./store";
import { CatBubble, Icon } from "./Icon";
import { Segmented } from "./ui";
import { fmt } from "@/lib/format";

// safe calculator: + − × ÷ with × ÷ precedence
function calc(expr: string): number {
  const toks = String(expr).match(/(\d+\.?\d*|[+\-×÷])/g);
  if (!toks) return 0;
  const t = toks.map((x) => (x === "×" ? "*" : x === "÷" ? "/" : x === "−" ? "-" : x));
  while (t.length && "*/+-".includes(t[t.length - 1])) t.pop();
  if (!t.length) return 0;
  const stack = [parseFloat(t[0]) || 0];
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i];
    const n = parseFloat(t[i + 1]) || 0;
    if (op === "*") stack.push(stack.pop()! * n);
    else if (op === "/") stack.push(n === 0 ? 0 : stack.pop()! / n);
    else if (op === "+") stack.push(n);
    else if (op === "-") stack.push(-n);
  }
  return stack.reduce((a, b) => a + b, 0);
}

function Key({ label, onClick, variant, accent }: { label: ReactNode; onClick: () => void; variant?: "op"; accent: string }) {
  return (
    <button
      onClick={onClick}
      className="key-btn"
      style={{
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        borderRadius: 14,
        fontSize: 22,
        fontWeight: 700,
        background: variant === "op" ? "var(--bg-2)" : "var(--surface)",
        color: variant === "op" ? accent : "var(--text)",
        display: "grid",
        placeItems: "center",
        height: 54,
        boxShadow: "var(--shadow-card)",
      }}
    >
      {label}
    </button>
  );
}

function EntryForm({
  initialType,
  initialDate,
  edit,
}: {
  initialType: TxType;
  initialDate: string;
  edit: UITx | null;
}) {
  const { closeEntry, categories, addTransaction, updateTransaction, deleteTransaction } = useStore();
  const [type, setType] = useState<TxType>(initialType);
  const [expr, setExpr] = useState(edit ? String(edit.amount) : "");
  const [catId, setCatId] = useState<string | null>(edit ? edit.cat : null);
  const [note, setNote] = useState(edit ? edit.note : "");
  const [date, setDate] = useState(initialDate);
  const [panel, setPanel] = useState<"pad" | "cats">("pad");
  const [busy, setBusy] = useState(false);

  const cats = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);
  const cat = categories.find((c) => c.id === catId);
  const hasOp = /[+\-×÷]/.test(expr);
  const result = calc(expr);

  function push(ch: string) {
    setExpr((e) => {
      if ("+×÷".includes(ch) || ch === "−") {
        if (e === "") return ch === "−" ? "−" : e;
        if ("+−×÷".includes(e[e.length - 1])) return e.slice(0, -1) + ch;
        return e + ch;
      }
      if (ch === ".") {
        const last = e.split(/[+\-×÷]/).pop()!;
        if (last.includes(".")) return e;
        return e + (e === "" || "+−×÷".includes(e[e.length - 1]) ? "0." : ".");
      }
      return e + ch;
    });
  }
  function back() {
    setExpr((e) => e.slice(0, -1));
  }

  async function confirm() {
    const amount = Math.round(result);
    if (!amount || amount <= 0 || !catId || busy) return;
    setBusy(true);
    try {
      const [y, m, d] = date.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d, 12);
      if (edit) await updateTransaction(edit.id, { cat: catId, amount, date: dateObj, note: note.trim() });
      else await addTransaction({ cat: catId, amount, date: dateObj, note: note.trim() });
      closeEntry();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!edit || busy) return;
    setBusy(true);
    try {
      await deleteTransaction(edit.id);
      closeEntry();
    } finally {
      setBusy(false);
    }
  }

  const accent = type === "expense" ? "var(--red)" : "var(--green)";
  const canSave = result > 0 && !!catId && !busy;

  return (
    <div className="um-modal-scrim" onClick={closeEntry}>
      <div className="um-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, display: "flex", flexDirection: "column", maxHeight: "94vh" }}>
        <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>
          <div style={{ flex: 1 }}>
            <Segmented value={type} onChange={(v) => { setType(v); setCatId(null); }} options={[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }]} />
          </div>
          {edit && (
            <button className="icon-btn" onClick={remove} disabled={busy} aria-label="Eliminar" style={{ background: "var(--red-soft)" }}>
              <Icon name="Trash2" size={19} stroke={2} color="var(--red-600)" />
            </button>
          )}
          <button className="icon-btn" onClick={closeEntry} aria-label="Cerrar">
            <Icon name="X" size={22} stroke={2.2} color="var(--text-2)" />
          </button>
        </div>

        {panel === "cats" ? (
          <div className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "6px 18px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-3)", margin: "6px 2px 14px" }}>Elegí categoría</div>
            <div className="cat-grid">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCatId(c.id); setPanel("pad"); }}
                  className="cat-card"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 6px", borderRadius: 16, background: catId === c.id ? `color-mix(in srgb, ${c.color} 14%, var(--surface))` : "var(--surface)", border: catId === c.id ? `2px solid ${c.color}` : "1px solid var(--line)", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <CatBubble icon={c.icon} color={c.color} size={48} stroke={2} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", textAlign: "center" }}>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ padding: "6px 22px 14px", textAlign: "right" }}>
              {hasOp && <div className="tnum" style={{ fontSize: 14, color: "var(--text-3)", fontWeight: 700, height: 18 }}>{expr.replace(/×/g, " × ").replace(/÷/g, " ÷ ")} =</div>}
              <div className="num tnum" style={{ fontSize: 44, fontWeight: 600, color: result > 0 ? accent : "var(--text-3)", lineHeight: 1.1 }}>
                {hasOp ? fmt(Math.round(result)) : expr === "" ? "$ 0" : "$ " + expr}
              </div>
            </div>

            <div style={{ padding: "0 18px 12px", display: "flex", flexDirection: "column", gap: 10, flex: "0 0 auto" }}>
              <button
                onClick={() => setPanel("cats")}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, width: "100%", background: "var(--bg-2)", border: "1px solid var(--line)", cursor: "pointer", fontFamily: "inherit" }}
              >
                {cat ? (
                  <CatBubble icon={cat.icon} color={cat.color} size={38} stroke={2} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--surface)", border: "1px dashed var(--line-strong)" }}>
                    <Icon name="Shapes" size={19} stroke={2} color="var(--text-3)" />
                  </div>
                )}
                <span style={{ flex: 1, textAlign: "left", fontWeight: 700, fontSize: 15, color: cat ? "var(--text)" : "var(--text-3)" }}>{cat ? cat.name : "Elegir categoría"}</span>
                <Icon name="ChevronRight" size={20} stroke={2.2} color="var(--text-3)" />
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 14, background: "var(--bg-2)", border: "1px solid var(--line)" }}>
                  <Icon name="PenLine" size={17} stroke={2} color="var(--text-3)" />
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "var(--text)" }} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 12px", borderRadius: 14, background: "var(--bg-2)", border: "1px solid var(--line)", cursor: "pointer" }}>
                  <Icon name="Calendar" size={17} stroke={2} color="var(--text-3)" />
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: "none", background: "transparent", outline: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }} />
                </label>
              </div>
            </div>

            <div style={{ padding: "4px 18px 18px", flex: "0 0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9 }}>
                <Key accent={accent} label="7" onClick={() => push("7")} /><Key accent={accent} label="8" onClick={() => push("8")} /><Key accent={accent} label="9" onClick={() => push("9")} /><Key accent={accent} label="÷" variant="op" onClick={() => push("÷")} />
                <Key accent={accent} label="4" onClick={() => push("4")} /><Key accent={accent} label="5" onClick={() => push("5")} /><Key accent={accent} label="6" onClick={() => push("6")} /><Key accent={accent} label="×" variant="op" onClick={() => push("×")} />
                <Key accent={accent} label="1" onClick={() => push("1")} /><Key accent={accent} label="2" onClick={() => push("2")} /><Key accent={accent} label="3" onClick={() => push("3")} /><Key accent={accent} label="−" variant="op" onClick={() => push("−")} />
                <Key accent={accent} label="." onClick={() => push(".")} /><Key accent={accent} label="0" onClick={() => push("0")} /><Key accent={accent} label={<Icon name="Delete" size={22} stroke={2} color="var(--text-2)" />} onClick={back} /><Key accent={accent} label="+" variant="op" onClick={() => push("+")} />
              </div>
              <button
                onClick={confirm}
                disabled={!canSave}
                style={{ marginTop: 12, width: "100%", padding: "15px", borderRadius: 14, border: "none", fontFamily: "inherit", background: canSave ? accent : "var(--bg-2)", color: canSave ? "#fff" : "var(--text-3)", fontWeight: 800, fontSize: 16, cursor: canSave ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}
              >
                <Icon name="Check" size={20} stroke={2.6} color={canSave ? "#fff" : "var(--text-3)"} />
                {edit ? "Guardar cambios" : type === "expense" ? "Agregar gasto" : "Agregar ingreso"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NewEntryModal() {
  const { entry, ref } = useStore();
  if (!entry.open) return null;
  const initialType: TxType = entry.edit ? entry.edit.type : entry.kind || "expense";
  const initialDate = entry.edit ? toISO(entry.edit.date) : entry.date ? toISO(entry.date) : toISO(ref);
  const formKey = entry.edit ? "edit-" + entry.edit.id : "new-" + initialType + "-" + initialDate;
  return <EntryForm key={formKey} initialType={initialType} initialDate={initialDate} edit={entry.edit} />;
}
