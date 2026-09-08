import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { faClock, faPlay } from "@fortawesome/free-solid-svg-icons";
import type { ScheduleDto } from "@tournament-hub/contracts";

import { getDivisionSummary } from "@/features/division/api/division.api";
import { divisionKeys } from "@/features/division/api/division.keys";
import { useDivisionEntrantsQuery } from "@/features/division/model/useDivisionEntrantsQuery";
import type { TournamentDivisionOption } from "@/features/tournament/model/types";
import { useMatches } from "@/features/match/model/useMatches";
import ConnectedMatchCard from "@/features/match/ui/ConnectedMatchCard";
import MatchListRow from "@/features/match/ui/MatchListRow";
import { rowOfSummary } from "@/features/match/model/matchRow";
import * as MatchesApi from "@/features/match/api/match.api";
import { isScheduleBlocked, scheduleInterruptionMessage, scheduleStaleMessage, scheduleStatusLabel } from "@/features/schedule/model/scheduleStatus";
import StatusIcon from "@/shared/components/ui/StatusIcon";
import ContextMenu, { useContextMenu } from "@/shared/components/ui/ContextMenu";
import FormModal from "@/shared/components/ui/FormModal";
import { useLongPress } from "@/shared/hooks/useLongPress";
import { usePageNotices } from "@/shared/context/PageNoticeContext";
import { btnPrimary, btnSecondary, focusRing } from "@/styles/buttonStyles";

type Props = {
    schedule: ScheduleDto;
    tournamentId: number;
    divisions: TournamentDivisionOption[];
    busy: boolean;
    onEdit: () => void;
    onStart: () => Promise<void>;
    onStop: () => Promise<void>;
    onArchive: () => Promise<void>;
    onUnarchive: () => Promise<void>;
    onStartFrom: (entryId: number) => Promise<void>;
    onUpdateEntryTime: (entryId: number, expectedDurationMinutes: number) => Promise<void>;
};

export default function ControlRoomSchedulePanel(props: Props) {
    const { schedule } = props;
    const { menu, openMenu, closeMenu } = useContextMenu();
    const { report } = usePageNotices();
    const [selectedEntryId, setSelectedEntryId] = useState<number | null>(() => schedule.currentEntryId ?? schedule.entries[0]?.id ?? null);
    const [committingMatchId, setCommittingMatchId] = useState<number | null>(null);
    const [timingEntry, setTimingEntry] = useState<ScheduleDto["entries"][number] | null>(null);
    const selected = schedule.entries.find((entry) => entry.id === selectedEntryId) ?? null;
    const staleMessage = scheduleStaleMessage(schedule);
    const blocked = isScheduleBlocked(schedule);
    const interruptionMessage = scheduleInterruptionMessage(schedule);
    const status = schedule.status === "completed"
        ? "done"
        : blocked ? "failed" : schedule.staleCode ? "pending" : schedule.status === "running" ? "running" : "idle";

    useEffect(() => {
        setSelectedEntryId((current) => schedule.entries.some((entry) => entry.id === current) ? current : schedule.currentEntryId ?? schedule.entries[0]?.id ?? null);
    }, [schedule.currentEntryId, schedule.entries]);

    async function commitMatch(matchId: number) {
        setCommittingMatchId(matchId);
        try {
            const { startggReport } = await MatchesApi.commitMatchResult(matchId);
            if (startggReport === "failed") {
                report("Match completed, but reporting the result to start.gg failed.", {
                    tone: "warning",
                    detail: "The bracket here is correct. The one on start.gg is not.",
                });
            }
        } catch (error) {
            console.error("Error committing match result.", error);
            report("Error committing match result.");
        } finally {
            setCommittingMatchId(null);
        }
    }

    return (
        <section className="min-w-0 w-full bg-ui-surface p-4">
            <div className="flex flex-wrap items-center gap-3">
                <StatusIcon status={status} />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold text-ui-text">{schedule.name}</h2>
                    <p className="text-sm text-ui-text-mute">{scheduleStatusLabel(schedule)}</p>
                </div>
                <ScheduleActions {...props} />
            </div>

            {staleMessage && (
                <div
                    className={`mt-4 rounded border px-3 py-2 text-sm text-ui-text-soft ${
                        blocked ? "border-state-failed/40 bg-state-failed/10" : "border-state-pending/30 bg-state-pending/10"
                    }`}
                >
                    <strong className="text-ui-text">{blocked ? "Blocked:" : "Waiting:"}</strong> {staleMessage}
                </div>
            )}

            {interruptionMessage && schedule.status === "inactive" && (
                <div className="mt-4 rounded border border-state-pending/30 bg-state-pending/10 px-3 py-2 text-sm text-ui-text-soft">
                    <strong className="text-ui-text">Interrupted:</strong> {interruptionMessage}
                </div>
            )}

            {selected ? (
                <SelectedMatch entry={selected} tournamentId={props.tournamentId} divisions={props.divisions} />
            ) : (
                <p className="mt-4 rounded border border-dashed border-ui-border-strong py-8 text-center text-sm text-ui-text-mute">
                    {schedule.status === "completed" ? "Schedule completed." : "No match selected."}
                </p>
            )}

            <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ui-text-mute">Queue</h3>
                <div className="flex flex-col gap-1">
                    {schedule.entries.map((entry) => (
                        <QueueEntryRow
                            key={entry.id}
                            entry={entry}
                            current={entry.id === schedule.currentEntryId}
                            selected={entry.id === selectedEntryId}
                            canStartFrom={schedule.status === "inactive"}
                            committing={committingMatchId === entry.match.id}
                            onSelect={() => setSelectedEntryId(entry.id)}
                            onCommit={() => void commitMatch(entry.match.id)}
                            onStartFrom={() => props.onStartFrom(entry.id)}
                            canEditTime={schedule.status !== "completed" && !schedule.archivedAt}
                            onEditTime={() => setTimingEntry(entry)}
                            onOpenMenu={openMenu}
                        />
                    ))}
                    {schedule.entries.length === 0 && <p className="text-sm text-ui-text-mute">No matches assigned.</p>}
                </div>
            </div>
            {createPortal(<ContextMenu state={menu} onClose={closeMenu} />, document.body)}
            <EditEntryTimeModal
                entry={timingEntry}
                onClose={() => setTimingEntry(null)}
                onSave={async (minutes) => {
                    if (!timingEntry) return;
                    await props.onUpdateEntryTime(timingEntry.id, minutes);
                    setTimingEntry(null);
                }}
            />
        </section>
    );
}

function QueueEntryRow({
    entry,
    current,
    selected,
    canStartFrom,
    committing,
    onSelect,
    onCommit,
    onStartFrom,
    canEditTime,
    onEditTime,
    onOpenMenu,
}: {
    entry: ScheduleDto["entries"][number];
    current: boolean;
    selected: boolean;
    canStartFrom: boolean;
    committing: boolean;
    onSelect: () => void;
    onCommit: () => void;
    onStartFrom: () => Promise<void>;
    canEditTime: boolean;
    onEditTime: () => void;
    onOpenMenu: ReturnType<typeof useContextMenu>["openMenu"];
}) {
    const openActions = (x: number, y: number) => onOpenMenu(x, y, entry.match.name, [
        {
            key: "edit-time",
            label: "Edit time",
            icon: faClock,
            disabled: !canEditTime,
            onSelect: onEditTime,
        },
        {
            key: "start-here",
            label: "Start from here",
            icon: faPlay,
            disabled: !canStartFrom,
            onSelect: onStartFrom,
        },
    ]);
    const longPress = useLongPress(openActions);

    return (
        <div
            {...longPress}
            className={longPress.className}
            onContextMenu={(event) => {
                event.preventDefault();
                openActions(event.clientX, event.clientY);
            }}
        >
            <MatchListRow
                match={{ ...rowOfSummary(entry.match), active: current }}
                activeLabel={current ? "The schedule is at this match" : "The schedule is not at this match"}
                selected={selected}
                routed={false}
                controls={!committing}
                onSelect={onSelect}
                onCommit={onCommit}
                onTiebreak={onSelect}
            />
        </div>
    );
}

function EditEntryTimeModal({
    entry,
    onClose,
    onSave,
}: {
    entry: ScheduleDto["entries"][number] | null;
    onClose: () => void;
    onSave: (minutes: number) => Promise<void>;
}) {
    const [minutes, setMinutes] = useState(entry?.expectedDurationMinutes ?? 30);

    useEffect(() => {
        if (entry) setMinutes(entry.expectedDurationMinutes);
    }, [entry]);

    return (
        <FormModal
            open={entry !== null}
            onClose={onClose}
            title="Edit expected duration"
            confirmText="Save time"
            validate={() => (minutes >= 1 && minutes <= 1440 ? [] : ["A match lasts between 1 and 1440 minutes."])}
            onConfirm={() => onSave(minutes)}
            failureFallback="The expected duration could not be saved."
        >
            <label className="text-sm font-semibold text-ui-text">
                {entry?.match.name}
                <span className="mt-2 flex items-center gap-2">
                    <input type="number" min={1} max={1440} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className={`w-28 rounded border border-ui-border bg-ui-canvas px-3 py-2 font-normal ${focusRing}`} />
                    <span className="font-normal text-ui-text-mute">minutes</span>
                </span>
            </label>
            <p className="text-sm text-ui-text-mute">Later expected start times are recalculated automatically. The planned schedule is not overwritten by live delay.</p>
        </FormModal>
    );
}

function ScheduleActions(props: Props) {
    const { schedule, busy } = props;
    return (
        <div className="flex flex-wrap gap-2">
            {schedule.status === "inactive" && (
                <>
                    <button type="button" className={btnSecondary} disabled={busy} onClick={props.onEdit}>
                        Edit
                    </button>
                    <button type="button" className={btnPrimary} disabled={busy || schedule.entries.length === 0} onClick={() => props.onStart()}>
                        Start
                    </button>
                </>
            )}
            {schedule.status === "running" && (
                <button type="button" className={btnSecondary} disabled={busy} onClick={() => props.onStop()}>
                    Stop
                </button>
            )}
            {schedule.status === "completed" &&
                (schedule.archivedAt ? (
                    <button type="button" className={btnSecondary} disabled={busy} onClick={() => props.onUnarchive()}>
                        Unarchive
                    </button>
                ) : (
                    <button type="button" className={btnSecondary} disabled={busy} onClick={() => props.onArchive()}>
                        Archive
                    </button>
                ))}
        </div>
    );
}

function SelectedMatch({ entry, tournamentId, divisions }: { entry: ScheduleDto["entries"][number]; tournamentId: number; divisions: TournamentDivisionOption[] }) {
    const divisionId = divisionIdOf(divisions, entry.match.phaseGroupId);
    if (!divisionId) {
        return <p className="mt-4 text-sm text-state-failed">Unable to locate the selected match division.</p>;
    }

    return <ConnectedSelectedMatch matchId={entry.match.id} divisionId={divisionId} tournamentId={tournamentId} />;
}

function ConnectedSelectedMatch({ matchId, divisionId, tournamentId }: { matchId: number; divisionId: number; tournamentId: number }) {
    const division = useQuery({ queryKey: divisionKeys.summary(divisionId), queryFn: () => getDivisionSummary(divisionId) });
    const entrants = useDivisionEntrantsQuery(divisionId);
    const matches = useMatches(divisionId);
    const [highlight, setHighlight] = useState({ matchId: null as number | null, phaseGroupId: null as number | null });
    const match = matches.matches.find((candidate) => candidate.id === matchId);

    if (!division.data || !match) return <p className="mt-4 text-sm text-ui-text-mute">Loading selected match…</p>;

    return (
        <div className="mt-4">
            <ConnectedMatchCard
                match={match}
                division={division.data}
                divisionEntrants={entrants.data ?? []}
                allMatches={matches.matches}
                actions={matches.actions}
                controls
                tournamentId={tournamentId}
                highlight={highlight}
                onHighlight={setHighlight}
            />
        </div>
    );
}

function divisionIdOf(divisions: TournamentDivisionOption[], phaseGroupId: number): number | null {
    return divisions.find((division) => division.phases.some((phase) => phase.phaseGroups?.some((pool) => pool.id === phaseGroupId)))?.id ?? null;
}
