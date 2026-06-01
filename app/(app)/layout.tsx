import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UnaMonedita",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
