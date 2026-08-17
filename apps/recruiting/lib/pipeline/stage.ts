import { prisma } from "@/lib/db";

/**
 * 選考フェーズの変更。
 * 変更は必ず履歴（CandidateStageHistory）に残す。
 * 履歴がないとファネルの転換率も滞留日数も後から算出できないため、
 * フェーズ変更は必ずこの関数を通す。
 */
export async function setCandidateStage(
  candidateId: string,
  stageCode: string,
  options: {
    changedBy?: string | null;
    changedVia?: "manual" | "form" | "system";
    note?: string;
    /** 既に先のフェーズにいる場合は戻さない（自動処理向け） */
    onlyForward?: boolean;
  } = {},
): Promise<{ changed: boolean; stageCode: string }> {
  const [candidate, stage] = await Promise.all([
    prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { stageId: true, stage: { select: { code: true, sortOrder: true } } },
    }),
    prisma.pipelineStage.findUnique({
      where: { code: stageCode },
      select: { id: true, code: true, sortOrder: true },
    }),
  ]);

  if (!candidate || !stage) {
    return { changed: false, stageCode: candidate?.stage.code ?? stageCode };
  }

  if (candidate.stageId === stage.id) {
    return { changed: false, stageCode: stage.code };
  }

  if (options.onlyForward && candidate.stage.sortOrder > stage.sortOrder) {
    return { changed: false, stageCode: candidate.stage.code };
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: { stageId: stage.id, stageChangedAt: now },
    }),
    prisma.candidateStageHistory.create({
      data: {
        candidateId,
        fromStageId: candidate.stageId,
        toStageId: stage.id,
        changedBy: options.changedBy ?? null,
        changedVia: options.changedVia ?? "system",
        note: options.note,
        changedAt: now,
      },
    }),
  ]);

  return { changed: true, stageCode: stage.code };
}
