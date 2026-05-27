import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";

export const metadata: Metadata = {
  title: "リピスト | サロン向け再来特化 CRM",
  description: "予約・カルテ・会計・回数券・LINE CRM・KPI を統合したサロン向け CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="flex h-screen overflow-hidden">
          <AppSidebar />
          <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
