import { blockDensity, previewLineup, type ScheduleBlockDensity, type ScheduleBoardBlock } from "@/features/schedule/model/scheduleBoard";
import { formatClock } from "@/features/schedule/model/scheduleDateTime";
import StatusIcon from "@/shared/components/ui/StatusIcon";
import { focusRing } from "@/styles/buttonStyles";


const STATE_STYLE: Record<ScheduleBoardBlock["state"], string> = {
    completed: "border-ui-separator bg-ui-raised",
    playing: "border-state-live bg-ui-surface shadow-[0_0_0_3px_rgb(var(--state-live)/0.14)]",
    waiting: "border-state-pending bg-state-pending/10",
    upcoming: "border-ui-border bg-ui-surface",
};

export default function ScheduleBoardCard({
    block,
    divisionName,
    addressLabel,
    wide,
    selected,
    anchor = false,
    onOpen,
}: {
    block: ScheduleBoardBlock;
    divisionName: string | null;
    addressLabel: string | null;
    wide: boolean;
    selected: boolean;
    anchor?: boolean;
    onOpen: () => void;
}) {
    const { entry, state } = block;
    const density = blockDensity(block.height, wide);
    const lineup = previewLineup(entry.match);

    return (
        <button
            type="button"
            onClick={onOpen}
            data-anchor={anchor ? "true" : undefined}
            style={{ top: block.top, height: block.height }}
            className={`absolute inset-x-0 overflow-hidden rounded-lg border px-2.5 py-2 text-left shadow-sm transition-colors hover:border-ui-border-strong ${focusRing} ${
                STATE_STYLE[state]
            } ${selected ? "ring-2 ring-ui-accent" : ""}`}
        >
            <span className="flex items-center gap-1.5">
                <BlockMarker state={state} />
                <span className="truncate text-[11px] font-semibold text-ui-text-mute">{timeLabel(block, density)}</span>
                {divisionName && <span className="ml-auto shrink-0 truncate text-[9px] font-bold uppercase tracking-wider text-ui-text-mute">{divisionName}</span>}
            </span>
            <span className={`mt-0.5 block truncate text-sm font-bold ${state === "completed" ? "text-ui-text-soft" : "text-ui-text"}`}>{entry.match.name}</span>
            {density === "detailed" && addressLabel && <span className="mt-0.5 block truncate text-[11px] text-ui-text-mute">{addressLabel}</span>}
            {density !== "minimal" && <Lineup lineup={lineup} state={state} density={density} />}
        </button>
    );
}

function Lineup({
    lineup,
    state,
    density,
}: {
    lineup: ReturnType<typeof previewLineup>;
    state: ScheduleBoardBlock["state"];
    density: ScheduleBlockDensity;
}) {
    if (state === "completed") {
        return <span className="mt-1 block truncate text-[11px] text-ui-text-mute">{lineup.winnerName ? `Won by ${lineup.winnerName}` : "Completed"}</span>;
    }

    return (
        <span className="mt-1 block text-[11px] leading-4">
            {density === "detailed"
                ? lineup.playerNames.map((name) => (
                      <span key={name} className="block truncate text-ui-text-soft">
                          {name}
                      </span>
                  ))
                : lineup.playerNames.length > 0 && <span className="block truncate text-ui-text-soft">{lineup.playerNames.join(" · ")}</span>}
            {lineup.pendingSources.map((label) => (
                <span key={label} className="block truncate italic text-ui-text-mute">
                    {label}
                </span>
            ))}
            {lineup.playerNames.length === 0 && lineup.pendingSources.length === 0 && <span className="block text-ui-text-mute">No players yet</span>}
        </span>
    );
}

function BlockMarker({ state }: { state: ScheduleBoardBlock["state"] }) {
    if (state === "playing") {
        return (
            <>
                <span role="img" aria-label="Playing now" className="h-2 w-2 shrink-0 rounded-full bg-state-live" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-state-live">Now</span>
            </>
        );
    }
    if (state === "waiting") {
        return (
            <>
                <StatusIcon status="pending" className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-state-pending">Waiting</span>
            </>
        );
    }

    return <StatusIcon status={state === "completed" ? "done" : "idle"} className="h-3 w-3" />;
}

function timeLabel(block: ScheduleBoardBlock, density: ScheduleBlockDensity): string {
    const range = `${formatClock(block.startMs)} – ${formatClock(block.endMs)}`;
    if (block.state !== "completed") {
        return density === "detailed" ? `${range} · ${block.entry.expectedDurationMinutes} min` : range;
    }

    return density === "detailed" ? range : formatClock(block.startMs);
}
