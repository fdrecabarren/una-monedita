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

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: "dashboard", label: "Resumen", icon: "ChartPie" },
  { id: "movimientos", label: "Movimientos", icon: "List" },
  { id: "calendario", label: "Calendario", icon: "CalendarDays" },
  { id: "recurrentes", label: "Fijos", icon: "Repeat" },
  { id: "categorias", label: "Categorías", icon: "Tags" },
  { id: "ajustes", label: "Ajustes", icon: "Settings" },
];

function Logo({ size = 30 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <img
        src="/logo.png"
        alt="UnaMonedita"
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: size * 0.3, flex: "0 0 auto", objectFit: "cover" }}
      />
      <span style={{ fontWeight: 800, fontSize: size * 0.55 }}>UnaMonedita</span>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useStore();
  const dark = theme === "dark";
  return (
    <button className="icon-btn" onClick={() => setTheme(dark ? "light" : "dark")} aria-label="Cambiar tema" title="Tema claro / oscuro">
      <Icon name={dark ? "Sun" : "Moon"} size={20} stroke={2} color="var(--text-2)" />
    </button>
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
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 8px", flex: "0 0 auto" }}>
        {screen === "dashboard" ? <Logo size={28} /> : <div className="num" style={{ fontWeight: 600, fontSize: 24 }}>{title}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {screen === "movimientos" && (
            <button className="icon-btn" onClick={() => openEntry("expense")} aria-label="Agregar">
              <Icon name="Plus" size={22} stroke={2.4} color="var(--text-2)" />
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>
      <main style={{ flex: 1, minHeight: 0 }}>
        <ScreenBody screen={screen} />
      </main>
      <nav style={{ display: "flex", borderTop: "1px solid var(--line)", background: "var(--surface)", flex: "0 0 auto", paddingBottom: "calc(4px + env(safe-area-inset-bottom))" }}>
        {NAV.map((n) => {
          const on = screen === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setScreen(n.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "9px 0 7px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}
            >
              <Icon name={n.icon} size={20} stroke={on ? 2.4 : 2} color={on ? "var(--green)" : "var(--text-3)"} />
              <span style={{ fontSize: 9.5, fontWeight: on ? 800 : 600, color: on ? "var(--green)" : "var(--text-3)" }}>{n.label}</span>
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
      <aside style={{ borderRight: "1px solid var(--line)", background: "var(--surface)", padding: "22px 16px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ padding: "0 6px" }}><Logo size={30} /></div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map((n) => {
            const on = screen === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setScreen(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 11, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", background: on ? "var(--green-soft)" : "transparent", color: on ? "var(--green-700)" : "var(--text-2)", fontWeight: on ? 800 : 600, fontSize: 14.5 }}
              >
                <Icon name={n.icon} size={20} stroke={2} color={on ? "var(--green-700)" : "var(--text-3)"} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => openEntry("expense")} className="fab-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "12px", borderRadius: 12, background: "var(--red)", color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="Minus" size={18} stroke={3} color="#fff" /> Gasto
          </button>
          <button onClick={() => openEntry("income")} className="fab-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "12px", borderRadius: 12, background: "var(--green)", color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="Plus" size={18} stroke={3} color="#fff" /> Ingreso
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 0" }}>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 700 }}>Tema</span>
            <ThemeToggle />
          </div>
        </div>
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
              <div className="num" style={{ fontWeight: 600, fontSize: 28, marginBottom: 12 }}>Movimientos</div>
              <Movimientos />
            </div>
          </div>
        )}
        {screen === "recurrentes" && (
          <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 32px" }}>
              <div className="num" style={{ fontWeight: 600, fontSize: 28, marginBottom: 16 }}>Fijos</div>
              <Recurrentes />
            </div>
          </div>
        )}
        {screen === "categorias" && (
          <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
            <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 24px 32px" }}>
              <div className="num" style={{ fontWeight: 600, fontSize: 28, marginBottom: 16 }}>Categorías</div>
              <Categorias />
            </div>
          </div>
        )}
        {screen === "ajustes" && (
          <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 32px" }}>
              <div className="num" style={{ fontWeight: 600, fontSize: 28, marginBottom: 16 }}>Ajustes</div>
              <Ajustes />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export function Shell() {
  const s = useStore();
  const [isDesktop, setDesktop] = useState(false);
  useEffect(() => {
    const onResize = () => setDesktop(window.innerWidth > 760);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      className={"app-root " + (isDesktop ? "desktop" : "mobile")}
      data-theme={s.theme}
      data-accent={s.accent}
      style={{ height: "100dvh", width: "100%", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>{isDesktop ? <DesktopLayout /> : <MobileLayout />}</div>
      <NewEntryModal />
    </div>
  );
}
