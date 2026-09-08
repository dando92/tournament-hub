import type { PlacementRunStepDto } from "@tournament-hub/contracts";

export default function RunChips({ run }: { run: PlacementRunStepDto[] }) {
  if (run.length === 0) {
    return <span className="text-xs text-ui-text-mute">—</span>;
  }

  return (
    <span className="flex flex-wrap gap-1">
      {run.map((step, index) => (
        <span
          key={`${step.name}-${index}`}
          title={step.name}
          className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1 text-[10px] font-bold ${
            step.won ? "bg-state-done/12 text-state-done" : "bg-ui-text-mute/12 text-ui-text-mute"
          }`}
        >
          {step.label}
        </span>
      ))}
    </span>
  );
}
