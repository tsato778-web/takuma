import { prisma } from "@/lib/db";
import type { LineMessage } from "./types";

/**
 * テンプレート（複数の吹き出し）を LINE のメッセージオブジェクトへ変換する。
 * LINE は1リクエストあたり5吹き出しまでのため、超過分は切り捨てる。
 */

const MAX_BLOCKS = 5;

export type TemplateVariables = {
  name?: string | null;
  [key: string]: string | null | undefined;
};

/** {{name}} のような差し込み変数を置換する */
export function renderText(text: string, variables: TemplateVariables): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value == null || value === "" ? "" : String(value);
  });
}

type BlockContent = {
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  altText?: string;
  contents?: unknown;
};

export function blockToMessage(
  blockType: string,
  content: BlockContent,
  mediaUrl: string | null,
  variables: TemplateVariables,
): LineMessage | null {
  switch (blockType) {
    case "text": {
      const text = renderText(content.text ?? "", variables).trim();
      return text ? { type: "text", text: text.slice(0, 5000) } : null;
    }
    case "image": {
      const url = mediaUrl ?? content.originalContentUrl;
      if (!url) return null;
      return {
        type: "image",
        originalContentUrl: url,
        previewImageUrl: content.previewImageUrl ?? url,
      };
    }
    case "video": {
      const url = mediaUrl ?? content.originalContentUrl;
      if (!url || !content.previewImageUrl) return null;
      return {
        type: "video",
        originalContentUrl: url,
        previewImageUrl: content.previewImageUrl,
      };
    }
    case "flex": {
      if (!content.contents) return null;
      return {
        type: "flex",
        altText: renderText(content.altText ?? "メッセージ", variables),
        contents: content.contents,
      };
    }
    default:
      return null;
  }
}

/** テンプレートIDから送信用メッセージを組み立てる */
export async function renderTemplate(
  templateId: string,
  variables: TemplateVariables = {},
): Promise<LineMessage[]> {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: {
      blocks: {
        orderBy: { sortOrder: "asc" },
        include: { mediaAsset: { select: { publicUrl: true } } },
      },
    },
  });

  if (!template || !template.isActive) return [];

  return template.blocks
    .slice(0, MAX_BLOCKS)
    .map((block) =>
      blockToMessage(
        block.blockType,
        (block.content ?? {}) as BlockContent,
        block.mediaAsset?.publicUrl ?? null,
        variables,
      ),
    )
    .filter((message): message is LineMessage => message !== null);
}

/** 設定キーからテンプレートを引く（例：初回挨拶） */
export async function getTemplateIdBySetting(
  key: string,
): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  const value = setting?.value;
  return typeof value === "string" ? value : null;
}
