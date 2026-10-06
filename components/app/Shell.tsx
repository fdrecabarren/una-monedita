"use client";

import { useState, useEffect } from "react";
import { useStore, type Screen } from "./store";
import { Icon } from "./Icon";
import { DashboardMobile, DashboardDesktop } from "./screen-dashboard";
import { Movimientos } from "./screen-movimientos";
import { Calendario } from "./screen-calendario";
import { Categorias } from "./screen-categorias";
import { Recurrentes } from "./screen-recurrentes";
import { Ajustes } from "./screen-ajustes";
import { NewEntryModal } from "./modal-new-entry";
import { Toast } from "./ui";

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: "dashboard", label: "Resumen", icon: "ChartPie" },
  { id: "movimientos", label: "Movimientos", icon: "List" },
  { id: "calendario", label: "Calendario", icon: "CalendarDays" },
  { id: "recurrentes", label: "Fijos", icon: "Repeat" },
  { id: "categorias", label: "Categorías", icon: "Tags" },
  { id: "ajustes", label: "Ajustes", icon: "Settings" },
];
// Móvil: 5 pestañas (Categorías es configuración de baja frecuencia y se abre
// desde Ajustes). El desktop conserva las 6 en el sidebar.
const NAV_MOBILE = NAV.filter((n) => n.id !== "categorias");

function Logo({ size = 30 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: size * 0.3, flex: "0 0 auto", objectFit: "cover" }}
      />
      <span style={{ fontWeight: 800, fontSize: size * 0.55 }}>UnaMonedita</span>
    </div>
  );
}

function ScreenBody({ screen }: { screen: Screen }) {
  switch (screen) {
    case "dashboard":
      return <DashboardMobile />;
    case "movimientos":
      return <Movimientos />;
    case "calendario":
      return <Calendario />;
    case "recurrentes":
      return <Recurrentes />;
    case "categorias":
      return <Categorias />;
    case "ajustes":
      return <Ajustes />;
  }
}

function MobileLayout() {
  const { screen, setScreen, openEntry } = useStore();
  const title = screen === "dashboard" ? null : NAV.find((n) => n.id === screen)?.label;
  // Categorías cuelga de Ajustes: la pestaña activa sigue siendo Ajustes.
  const activeTab: Screen = screen === "categorias" ? "ajustes" : screen;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(10px + env(safe-area-inset-top)) 16px 4px", minHeight: 56, flex: "0 0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
          {screen === "categorias" && (
            <button className="icon-btn" onClick={() => setScreen("ajustes")} aria-label="Volver a Ajustes" style={{ marginLeft: -10 }}>
              <Icon name="ChevronLeft" size={22} stroke={2.4} color="var(--text-2)" />
            </button>
          )}
          {screen === "dashboard" ? <Logo size={28} /> : <h1 className="num" style={{ fontWeight: 600, fontSize: 24, margin: 0 }}>{title}</h1>}
        </div>
        {screen === "movimientos" && (
          <button className="icon-btn" onClick={() => openEntry("expense")} aria-label="Agregar gasto">
            <Icon name="Plus" size={22} stroke={2.4} color="var(--text-2)" />
          </button>
        )}
      </header>
      <main style={{ flex: 1, minHeight: 0 }}>
        <ScreenBody screen={screen} />
      </main>
      <nav aria-label="Secciones" style={{ display: "flex", borderTop: "1px solid var(--line)", background: "var(--surface)", flex: "0 0 auto", paddingBottom: "calc(4px + env(safe-area-inset-bottom))" }}>
        {NAV_MOBILE.map((n) => {
          const on = activeTab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setScreen(n.id)}
              aria-current={on ? "page" : undefined}
              style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0 6px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}
            >
              <span
                style={{ width: 56, height: 30, borderRadius: 15, display: "grid", placeItems: "center", background: on ? "var(--accent-soft)" : "transparent", transition: "background .15s" }}
              >
                <Icon name={n.icon} size={20} stroke={on ? 2.4 : 2} color={on ? "var(--accent-ink)" : "var(--text-2)"} />
              </span>
              <span style={{ fontSize: 11, fontWeight: on ? 800 : 700, color: on ? "var(--accent-ink)" : "var(--text-2)", whiteSpace: "nowrap" }}>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function DesktopLayout() {
  const { screen, setScreen, openEntry } = useStore();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "236px 1fr", height: "100%" }}>
      <aside style={{ borderRight: "1px solid var(--line)", background: "var(--surface)", padding: "22px 16px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ padding: "0 6px" }}><Logo size={30} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => openEntry("expense")} title="Agregar gasto (G)" className="fab-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "12px", minHeight: 44, borderRadius: 12, background: "var(--expense-fill)", color: "var(--on-expense)", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="Minus" size={18} stroke={3} color="var(--on-expense)" /> Agregar gasto
          </button>
          <button onClick={() => openEntry("income")} title="Agregar ingreso (I)" className="fab-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "12px", minHeight: 44, borderRadius: 12, background: "var(--income-fill)", color: "var(--on-income)", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="Plus" size={18} stroke={3} color="var(--on-income)" /> Agregar ingreso
          </button>
        </div>
        <nav aria-label="Secciones" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map((n) => {
            const on = screen === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setScreen(n.id)}
                aria-current={on ? "page" : undefined}
                style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", minHeight: 44, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", background: on ? "var(--accent-soft)" : "transparent", color: on ? "var(--accent-ink)" : "var(--text-2)", fontWeight: on ? 800 : 700, fontSize: 14.5 }}
              >
                <Icon name={n.icon} size={20} stroke={2} color={on ? "var(--accent-ink)" : "var(--text-2)"} />
                {n.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <main style={{ minWidth: 0, overflow: "hidden" }}>
        {screen === "dashboard" && <DashboardDesktop />}
        {screen === "calendario" && (
          <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
            <Calendario />
          </div>
        )}
        {screen === "movimientos" && (
          <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 32px" }}>
              <h1 className="num" style={{ fontWeight: 600, fontSize: 28, margin: "0 0 12px" }}>Movimientos</h1>
              <Movimientos />
            </div>
          </div>
        )}
        {screen === "recurrentes" && (
          <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 32px" }}>
              <h1 className="num" style={{ fontWeight: 600, fontSize: 28, margin: "0 0 16px" }}>Fijos</h1>
              <Recurrentes />
            </div>
          </div>
        )}
        {screen === "categorias" && (
          <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
            <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 24px 32px" }}>
              <h1 className="num" style={{ fontWeight: 600, fontSize: 28, margin: "0 0 16px" }}>Categorías</h1>
              <Categorias />
            </div>
          </div>
        )}
        {screen === "ajustes" && (
          <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 32px" }}>
              <h1 className="num" style={{ fontWeight: 600, fontSize: 28, margin: "0 0 16px" }}>Ajustes</h1>
              <Ajustes />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export function Shell() {
  const { openEntry } = useStore();
  const [isDesktop, setDesktop] = useState(false);
  useEffect(() => {
    const onResize = () => setDesktop(window.innerWidth > 760);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Atajos globales: G = agregar gasto, I = agregar ingreso. Se ignoran al
  // escribir en un campo, con modificadores o si ya hay un diálogo abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== "g" && k !== "i") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      openEntry(k === "g" ? "expense" : "income");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openEntry]);

  // El tema y el acento viven en <html> (ver app/layout.tsx y el store).
  return (
    <div
      className={"app-root " + (isDesktop ? "desktop" : "mobile")}
      style={{ height: "100dvh", width: "100%", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>{isDesktop ? <DesktopLayout /> : <MobileLayout />}</div>
      <NewEntryModal />
      <Toast desktop={isDesktop} />
    </div>
  );
}
