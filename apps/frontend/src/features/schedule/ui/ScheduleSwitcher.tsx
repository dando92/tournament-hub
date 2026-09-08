import type { ScheduleSummary } from "@/features/schedule/model/scheduleSummary";
import StatusIcon from "@/shared/components/ui/StatusIcon";
import { focusRing } from "@/styles/buttonStyles";


const TIMING_TONE: Record<"on-time" | "delayed" | "ahead", string> = {
    "on-time": "border-state-done/40 bg-state-done/10",
    delayed: "border-state-failed/40 bg-state-failed/10",
    ahead: "border-state-done/40 bg-state-done/10",
};

export function ScheduleSwitcherCard({
    summary,
    selected,
    onSelect,
    collapsed = false,
    className = "",
}: {
    summary: ScheduleSummary;
    selected: boolean;
    onSelect: () => void;
    collapsed?: boolean;
    className?: string;
}) {
    const badge = summary.timing?.label ?? summary.stateLabel.toUpperCase();
    const tone = summary.timing ? TIMING_TONE[summary.timing.tone] : "border-ui-border-strong bg-ui-raised";
    const badgeClass = `shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider text-ui-text-soft ${tone}`;

    if (collapsed) {
        return (
            <button
                type="button"
                title={summary.schedule.name}
                onClick={onSelect}
                className={`flex min-w-0 items-center gap-2 rounded-xl border border-ui-border bg-ui-surface px-2.5 py-2 text-ui-text-mute transition-colors hover:bg-ui-raised hover:text-ui-text ${focusRing} ${
                    summary.schedule.archivedAt ? "opacity-70" : ""
                } ${className}`}
            >
                <ScheduleGlyph summary={summary} />
                <span className="min-w-0 truncate text-xs font-semibold">{summary.schedule.name}</span>
                {summary.timing && summary.timing.tone !== "on-time" && <span className={badgeClass}>{summary.timing.shortLabel}</span>}
            </button>
        );
    }

    return (
        <button
            type="button"
            aria-current={selected ? "true" : undefined}
            onClick={onSelect}
            className={`flex min-w-0 flex-col gap-1 rounded-xl border px-3 py-2 text-left transition-colors ${focusRing} ${
                selected ? "border-ui-border-strong bg-ui-selected shadow-[inset_0_-3px_0_0_rgb(var(--ui-accent))]" : "border-ui-border bg-ui-surface hover:bg-ui-raised"
            } ${summary.schedule.archivedAt ? "opacity-70" : ""} ${className}`}
        >
            <span className="flex min-w-0 items-center gap-2">
                <ScheduleGlyph summary={summary} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-ui-text">{summary.schedule.name}</span>
                <span className={`hidden sm:inline-block ${badgeClass}`}>{badge}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-ui-text-mute">
                    {summary.stateLabel} · {summary.detail}
                </span>
                <span className={`sm:hidden ${badgeClass}`}>{badge}</span>
            </span>
        </button>
    );
}

export function ScheduleGlyph({ summary, className = "" }: { summary: ScheduleSummary; className?: string }) {
    if (summary.live) {
        return (
            <span
                aria-label="Playing now"
                role="img"
                className={`h-2.5 w-2.5 shrink-0 rounded-full bg-state-live shadow-[0_0_0_4px_rgb(var(--state-live)/0.18)] ${className}`}
            />
        );
    }

    return <StatusIcon status={summary.status} label={summary.stateLabel} className={className} />;
}

export default function ScheduleSwitcher({
    summaries,
    selectedId,
    onSelect,
}: {
    summaries: ScheduleSummary[];
    selectedId: number | null;
    onSelect: (scheduleId: number) => void;
}) {
    return (
        <div role="tablist" aria-label="Schedules" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {summaries.map((summary) => (
                <ScheduleSwitcherCard
                    key={summary.schedule.id}
                    summary={summary}
                    selected={summary.schedule.id === selectedId}
                    onSelect={() => onSelect(summary.schedule.id)}
                    className="w-56 shrink-0"
                />
            ))}
        </div>
    );
}
