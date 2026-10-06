"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Icon } from "./Icon";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Pila de sheets abiertos: solo el de arriba responde al teclado y recupera el
// foco (un editor de categoría con la tienda de íconos encima son dos sheets).
const openSheets: HTMLElement[] = [];
const isTop = (el: HTMLElement) => openSheets[openSheets.length - 1] === el;

// El último [data-autofocus] gana: una confirmación (ConfirmRow) se renderiza
// después de los campos del formulario y tiene prioridad sobre ellos.
function focusInside(el: HTMLElement) {
  const marked = el.querySelectorAll<HTMLElement>("[data-autofocus]");
  (marked[marked.length - 1] ?? el).focus({ preventScroll: true });
}

// Contenedor único de los modales de la app: scrim + hoja, con semántica de
// diálogo (role, aria-modal, nombre accesible), foco que entra y vuelve, trap de
// Tab y Escape para cerrar. `onClose` se llama con Escape y al tocar el scrim;
// cada modal decide qué hace (p. ej. pedir confirmación si hay datos sin guardar).
//
// El teclado se escucha en document (no en el diálogo): si el contenido cambia
// adentro (panel de categorías, confirmación de borrado) el elemento con foco se
// desmonta y el foco cae a <body>; así Escape sigue funcionando y, después de
// cada render, el foco perdido vuelve al diálogo (o a su [data-autofocus]).
export function Sheet({
  label,
  onClose,
  maxWidth = 460,
  style,
  children,
}: {
  label: string;
  onClose: () => void;
  maxWidth?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prev = document.activeElement as HTMLElement | null;
    openSheets.push(el);
    // el foco entra al diálogo; solo salta a un campo si lo pide (data-autofocus),
    // para no robarle las teclas a modales con teclado propio (calculadora).
    focusInside(el);

    function onKeyDown(e: KeyboardEvent) {
      if (!el || !isTop(el)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement
      );
      if (items.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && el.contains(active);
      if (e.shiftKey && (!inside || active === first || active === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const i = openSheets.lastIndexOf(el);
      if (i >= 0) openSheets.splice(i, 1);
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, []);

  // Después de cada render: si apareció un [data-autofocus] nuevo (p. ej. el
  // "Cancelar" de una confirmación) recibe el foco; si el foco quedó afuera (el
  // elemento enfocado se desmontó), vuelve al diálogo de arriba de la pila.
  const lastAuto = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !isTop(el)) return;
    const marked = el.querySelectorAll<HTMLElement>("[data-autofocus]");
    const auto = marked[marked.length - 1] ?? null;
    if (auto && auto !== lastAuto.current) {
      lastAuto.current = auto;
      auto.focus({ preventScroll: true });
      return;
    }
    lastAuto.current = auto;
    const active = document.activeElement;
    if (!active || active === document.body || !el.contains(active)) focusInside(el);
  });

  return (
    <div className="um-modal-scrim" onClick={() => closeRef.current()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="um-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth, outline: "none", ...style }}
      >
        {children}
      </div>
    </div>
  );
}

// Cabecera estándar: título (Fraunces 20/600), "‹ Volver" opcional y cerrar (44×44).
export function SheetHeader({
  title,
  onClose,
  onBack,
  backLabel,
  id,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
  id?: string;
}) {
  return (
    <div style={{ padding: "12px 12px 4px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flex: "0 0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
        {onBack && (
          <button className="icon-btn" onClick={onBack} aria-label={backLabel ?? "Volver"} style={{ marginLeft: -12 }}>
            <Icon name="ChevronLeft" size={22} stroke={2.4} color="var(--text-2)" />
          </button>
        )}
        <h2 id={id} className="sheet-title" style={{ margin: 0 }}>{title}</h2>
      </div>
      <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
        <Icon name="X" size={22} stroke={2.2} color="var(--text-2)" />
      </button>
    </div>
  );
}

// Confirmación destructiva dentro del propio sheet (sin diálogos del navegador):
// pregunta, aclara y ofrece [Cancelar] / [acción] con la acción en rojo.
// "Cancelar" lleva data-autofocus: el Sheet le pasa el foco al aparecer.
export function ConfirmRow({
  question,
  detail = "No se puede deshacer.",
  confirmLabel = "Eliminar",
  busy = false,
  onCancel,
  onConfirm,
}: {
  question: string;
  detail?: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div role="alertdialog" aria-label={question} style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "center", padding: "4px 0" }}>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{question}</div>
      <div className="caption">{detail}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button
          onClick={onCancel}
          data-autofocus
          style={{ flex: 1, minHeight: 48, borderRadius: 12, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--text-2)", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          style={{ flex: 1, minHeight: 48, borderRadius: 12, border: "none", background: "var(--expense-fill)", color: "var(--on-expense)", fontWeight: 800, fontSize: 15, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, fontFamily: "inherit" }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
