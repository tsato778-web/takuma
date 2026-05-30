import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { BrandProvider } from "@/lib/brand-context";

export const metadata: Metadata = {
  title: "リピスト | 再来率向上CRM プラットフォーム",
  description: "業種ではなくブランドごとに最適化される、再来率特化型CRM。次回予約率・離脱リスク・LTV・口コミ・紹介を中核指標として運用",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <BrandProvider>
          <div className="flex h-screen overflow-hidden">
            <AppSidebar />
            <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
          </div>
        </BrandProvider>
      </body>
    </html>
  );
}
