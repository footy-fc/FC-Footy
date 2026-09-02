export const MANAGER_RANK_BANDS = ["1-50", "51-100", "101-150", "151+"] as const;

export type ManagerRankBand = (typeof MANAGER_RANK_BANDS)[number];

export function getManagerRankBand(rank: number | null | undefined): ManagerRankBand | null {
  if (typeof rank !== "number" || !Number.isFinite(rank) || rank < 1) return null;
  if (rank <= 50) return "1-50";
  if (rank <= 100) return "51-100";
  if (rank <= 150) return "101-150";
  return "151+";
}

export function filterManagersByRankBand<T extends { bucket?: string }>(
  managers: T[],
  selectedBand: ManagerRankBand
): T[] {
  return managers.filter((manager) => manager.bucket === selectedBand);
}
