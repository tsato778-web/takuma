"use client";

import * as React from "react";
import { MapPin, Phone, Train, Image as ImageIcon, Plus } from "lucide-react";

import { PageShell, MockBadge, Chip } from "@/components/admin/page-shell";
import { useBrand } from "@/lib/brand-context";
import { STORES, BRANDS } from "@/lib/mock-data";

export default function StoresMasterPage() {
  const { brand } = useBrand();
  const stores = STORES.filter((s) => s.brandCode === brand.code);
  return (
    <PageShell
      title="店舗マスター"
      description="ブランドに紐付く店舗のプロフィール（住所・最寄駅・徒歩・電話・写真）を管理します。お客様予約画面の上部カードに反映されます。"
      action={<MockBadge />}
    >
      <div className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>運用中ブランド：</span>
        <Chip tone="accent">{brand.code}・{brand.name}</Chip>
        <span className="ml-2">所属店舗 {stores.length} 件</span>
        <span className="ml-auto inline-flex cursor-default items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px]"><Plus className="h-3 w-3" />店舗を追加（モック）</span>
      </div>

      {stores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-6 text-center text-xs text-muted-foreground">
          このブランドに紐付く店舗がありません。サイドバーでブランドを切り替えるか、店舗を追加してください。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stores.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-xl border border-border bg-card">
              {/* 店舗写真 */}
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-secondary/40 to-secondary/10">
                {s.profile.photoUrls[0] ? (
                  // 外部画像は <img> で安全に表示。next/image は省略（モック）
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.profile.photoUrls[0]} alt={s.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-xs text-muted-foreground"><ImageIcon className="h-6 w-6" />写真未登録</div>
                )}
              </div>
              <div className="space-y-1.5 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{s.name}</div>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{s.code}</span>
                </div>
                <div className="flex items-start gap-1 text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{s.profile.address}</div>
                <div className="flex items-center gap-1 text-muted-foreground"><Train className="h-3 w-3 shrink-0" />{s.profile.nearestStation} 徒歩 {s.profile.walkMin} 分</div>
                <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3 shrink-0" />{s.profile.phone}</div>
                <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border pt-1.5 text-[10px] text-muted-foreground">
                  所属ブランド：<Chip tone="muted">{BRANDS.find((b) => b.code === s.brandCode)?.name ?? s.brandCode}</Chip>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">※ モックUI。本実装では店舗単位での編集・写真アップロード・公開/非公開設定を可能にします。</p>
    </PageShell>
  );
}
