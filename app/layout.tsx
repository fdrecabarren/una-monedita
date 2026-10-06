import type { Metadata, Viewport } from "next";
import { Nunito, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-app",
});
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
// Variable con ejes SOFT/opsz: la firma (.num-coin) usa cifras redondas y el
// navegador no sintetiza negritas.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "UnaMonedita · Finanzas personales",
  description: "Tu app personal de finanzas conectada a Notion",
  robots: "noindex, nofollow",
  appleWebApp: {
    capable: true,
    title: "UnaMonedita",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#171614" },
  ],
};

// Resuelve tema y acento antes del primer paint (evita el destello claro).
// um.theme: "system" | "light" | "dark" (default system); um.accent: verde | teal | bosque.
const THEME_BOOTSTRAP = `(function(){try{var d=document.documentElement,t=localStorage.getItem("um.theme")||"system",a=localStorage.getItem("um.accent")||"verde";if(t!=="light"&&t!=="dark")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=t;d.dataset.accent=a;}catch(e){document.documentElement.dataset.theme="light"}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${nunito.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
