import type { ChartDifficulty } from "@tournament-hub/contracts";

const SIMFILE_DIFFICULTIES: Record<string, ChartDifficulty> = {
  beginner: "Novice",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  challenge: "Expert",
  edit: "Edit",
};

export const CHART_DIFFICULTIES: ChartDifficulty[] = ["Novice", "Easy", "Medium", "Hard", "Expert", "Edit"];

export function normalizeDifficulty(value: string): ChartDifficulty | null {
  return SIMFILE_DIFFICULTIES[value.trim().toLowerCase()] ?? null;
}
