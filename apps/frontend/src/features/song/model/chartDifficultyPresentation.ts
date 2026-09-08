import type { ChartDifficulty } from "@tournament-hub/contracts";

export const chartDifficultyPresentation: Record<
  ChartDifficulty,
  { label: string; badge: string; text: string; border: string }
> = {
  Novice: { label: "Novice", badge: "bg-chart-novice", text: "text-chart-novice", border: "border-chart-novice" },
  Easy: { label: "Easy", badge: "bg-chart-easy", text: "text-chart-easy", border: "border-chart-easy" },
  Medium: { label: "Medium", badge: "bg-chart-medium", text: "text-chart-medium", border: "border-chart-medium" },
  Hard: { label: "Hard", badge: "bg-chart-hard", text: "text-chart-hard", border: "border-chart-hard" },
  Expert: { label: "Expert", badge: "bg-chart-expert", text: "text-chart-expert", border: "border-chart-expert" },
  Edit: { label: "Edit", badge: "bg-chart-edit", text: "text-chart-edit", border: "border-chart-edit" },
};

export function meterStep(difficulty: number): 1 | 2 | 3 | 4 | 5 {
  if (difficulty <= 3) return 1;
  if (difficulty <= 6) return 2;
  if (difficulty <= 9) return 3;
  if (difficulty <= 12) return 4;

  return 5;
}

const METER_BACKGROUND = ["bg-difficulty-1", "bg-difficulty-2", "bg-difficulty-3", "bg-difficulty-4", "bg-difficulty-5"];
const METER_FILL = ["fill-difficulty-1", "fill-difficulty-2", "fill-difficulty-3", "fill-difficulty-4", "fill-difficulty-5"];

export function meterColor(difficulty: number): string {
  return METER_BACKGROUND[meterStep(difficulty) - 1];
}

export function meterFill(difficulty: number): string {
  return METER_FILL[meterStep(difficulty) - 1];
}
