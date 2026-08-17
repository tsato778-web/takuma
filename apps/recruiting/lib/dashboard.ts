import { prisma } from "@/lib/db";
import { captureError } from "@/lib/observability";

export type StageCount = {
  code: string;
  name: string;
  kind: string;
  color: string;
  count: number;
};

export type DashboardSummary =
  | { ready: false; reason: "no_database_url" | "unreachable" }
  | { ready: true; totalCandidates: number; stages: StageCount[] };

/**
 * ダッシュボードのフェーズ別件数。
 * Sprint 0 時点では件数は 0 だが、DB 接続とマイグレーションの確認に使える。
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!process.env.DATABASE_URL) {
    return { ready: false, reason: "no_database_url" };
  }

  try {
    const [stages, grouped, totalCandidates] = await Promise.all([
      prisma.pipelineStage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, code: true, name: true, kind: true, color: true },
      }),
      prisma.candidate.groupBy({
        by: ["stageId"],
        where: { mergedIntoCandidateId: null },
        _count: { _all: true },
      }),
      prisma.candidate.count({ where: { mergedIntoCandidateId: null } }),
    ]);

    const counts = new Map(grouped.map((g) => [g.stageId, g._count._all]));

    return {
      ready: true,
      totalCandidates,
      stages: stages.map((s) => ({
        code: s.code,
        name: s.name,
        kind: s.kind,
        color: s.color,
        count: counts.get(s.id) ?? 0,
      })),
    };
  } catch (error) {
    captureError(error, { scope: "dashboard.summary" });
    return { ready: false, reason: "unreachable" };
  }
}
