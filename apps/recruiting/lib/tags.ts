import { prisma } from "@/lib/db";

export type TagAssignVia = "manual" | "form" | "scenario" | "rich_menu" | "system";

/** タグ名から付与する（存在しないタグ名は無視する） */
export async function addTagByName(
  candidateId: string,
  tagName: string,
  via: TagAssignVia = "system",
  assignedBy?: string | null,
): Promise<boolean> {
  const tag = await prisma.tag.findFirst({
    where: { name: tagName, isActive: true },
    select: { id: true },
  });
  if (!tag) return false;
  return addTagById(candidateId, tag.id, via, assignedBy);
}

export async function addTagById(
  candidateId: string,
  tagId: string,
  via: TagAssignVia = "system",
  assignedBy?: string | null,
): Promise<boolean> {
  await prisma.candidateTag.upsert({
    where: { candidateId_tagId: { candidateId, tagId } },
    create: { candidateId, tagId, assignedVia: via, assignedBy: assignedBy ?? null },
    update: {},
  });
  return true;
}

export async function removeTag(candidateId: string, tagId: string): Promise<void> {
  await prisma.candidateTag
    .delete({ where: { candidateId_tagId: { candidateId, tagId } } })
    .catch(() => undefined);
}
