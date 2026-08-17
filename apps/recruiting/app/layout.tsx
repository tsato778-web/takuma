import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAORU 採用管理",
  description: "NAORU 採用LINE・ATSシステム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
