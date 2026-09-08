import { percentage } from "@/features/stats/model/statsFormat";
import GradeMark from "@/features/stats/ui/GradeMark";

export default function ScoreWithGrade({ value, isFailed = false }: { value: number | null; isFailed?: boolean }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="font-semibold tabular-nums text-ui-text">{percentage(value)}</span>
      <span className="flex w-14 shrink-0 justify-start">
        <GradeMark percentage={value} isFailed={isFailed} />
      </span>
    </span>
  );
}
