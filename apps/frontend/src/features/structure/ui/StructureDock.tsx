import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDice, faTrash } from "@fortawesome/free-solid-svg-icons";

import StatusIcon from "@/shared/components/ui/StatusIcon";
import BaseModal from "@/shared/components/ui/BaseModal";
import MultiSelect from "@/shared/components/ui/MultiSelect";
import SongRollPanel from "@/features/song/ui/SongRollPanel";
import { useSongRoll } from "@/features/song/model/useSongRoll";
import { listSongs } from "@/features/song/api/song.api";
import { songKeys } from "@/features/song/api/song.keys";
import { displaySongTitle } from "@/features/song/model/songTitle";
import { btnDanger, btnPrimary, btnSecondary, focusRing } from "@/styles/buttonStyles";
import { ordinal, type CanvasCard, type CanvasSelection } from "@/features/structure/model/structureCanvas";
import { collectRoutes, routesOf } from "@/features/structure/model/structureRoutes";
import { seatingOf, songsOf, type StructureDraft } from "@/features/structure/model/structureDraft";
import type { AdvancementRuleDto } from "@tournament-hub/contracts";
import type { Entrant } from "@/features/participant/model/types";
import type { Match } from "@/features/match/model/types";
import type { TournamentDivisionOption, TournamentDivisionOptionPhase } from "@/features/tournament/model/types";

type Props = {
    tournamentId: number;
    division: TournamentDivisionOption | undefined;
    selection: CanvasSelection;
    card: CanvasCard | undefined;
    matches: Match[];
    roster: Entrant[];
    draft: StructureDraft;
    onRename: (name: string) => void;
    onDelete: () => void;
    onDeleteRoute: (targetKind: "pool" | "match", targetId: number, slot: number) => void;
    onSeat: (matchId: number, entrantIds: number[]) => void;
    onSetSongs: (matchId: number, songIds: number[]) => void;
    onClearSelection: () => void;
};

const NOUN = { phase: "Phase", pool: "Pool", match: "Match" } as const;

export default function StructureDock({
    tournamentId,
    division,
    selection,
    card,
    matches,
    roster,
    draft,
    onRename,
    onDelete,
    onDeleteRoute,
    onSeat,
    onSetSongs,
    onClearSelection,
}: Props) {
    const [name, setName] = useState("");
    const selected = selectedName(division, matches, selection);

    useEffect(() => setName(selected ?? ""), [selection?.kind, selection?.id, selected]);

    if (!selection || selected === undefined) {
        return (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-ui-border bg-ui-surface px-3.5 py-3">
                <p className="text-[12px] text-ui-text-mute">
                    Select a phase, a pool or a match to edit it here. The dashed slots add one; a placement chip draws a route.
                </p>
            </div>
        );
    }

    const phase = phaseOf(division, matches, selection);
    const pool = poolOf(division, matches, selection);
    const routes = selection.kind === "phase" ? { incoming: [], outgoing: [] } : routesOf(collectRoutes(division, matches), selection.kind, selection.id);
    const match = selection.kind === "match" ? matches.find((candidate) => candidate.id === selection.id) : undefined;

    return (
        <div className="flex max-h-[46%] shrink-0 overflow-y-auto rounded-xl border border-ui-border bg-ui-surface shadow-card">
            <Group className="w-[264px]">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ui-text-mute">{NOUN[selection.kind]}</span>
                    <button type="button" onClick={onClearSelection} className={`${focusRing} text-[12px] text-ui-text-mute hover:text-ui-text`}>
                        Clear
                    </button>
                </div>
                <input
                    value={name}
                    aria-label="Name"
                    onChange={(event) => setName(event.target.value)}
                    onBlur={() => name.trim() && name.trim() !== selected && onRename(name.trim())}
                    onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                    className={`w-full rounded-lg border border-ui-border-strong bg-ui-surface px-2 py-1.5 text-sm font-semibold text-ui-text outline-none ${focusRing}`}
                />
                <p className="text-[12px] text-ui-text-mute">
                    {division?.name}
                    {selection.kind !== "phase" && phase ? <Crumb>{phase.name}</Crumb> : null}
                    {selection.kind === "match" && pool ? <Crumb>{pool.name}</Crumb> : null}
                </p>
                <span className="flex items-center gap-2 text-[12px] text-ui-text-mute">
                    {card && <StatusIcon status={card.status} />}
                    {(card && card.meta.join(" · ")) || "nothing played yet"}
                </span>
                <button type="button" onClick={onDelete} className={`${btnDanger} w-fit text-xs`}>
                    <FontAwesomeIcon icon={faTrash} className="mr-1.5 text-[10px]" />
                    Delete {NOUN[selection.kind].toLowerCase()}
                </button>
            </Group>

            {selection.kind !== "phase" && (
                <>
                    <Group className="min-w-[220px] flex-1">
                        <Section label="Comes from" />
                        {routes.incoming.length === 0 ? (
                            <Empty>Nothing arrives here yet.</Empty>
                        ) : (
                            <RouteList
                                routes={routes.incoming}
                                render={(rule) => (
                                    <>
                                        <Pill>{rule.targetSlot}</Pill>
                                        <span>is</span>
                                        <Pill>{ordinal(rule.sourcePlacement)}</Pill>
                                        <span>of</span>
                                        <Pill>{rule.sourceName ?? "elsewhere"}</Pill>
                                    </>
                                )}
                                onDelete={onDeleteRoute}
                            />
                        )}
                    </Group>

                    <Group className="min-w-[220px] flex-1">
                        <Section label="Goes to" />
                        {routes.outgoing.length === 0 ? (
                            <Empty>Nothing advances out of this {selection.kind} yet.</Empty>
                        ) : (
                            <RouteList
                                routes={routes.outgoing}
                                render={(rule) => (
                                    <>
                                        <Pill>{ordinal(rule.sourcePlacement)}</Pill>
                                        <span>goes to</span>
                                        <Pill>{rule.targetName ?? "elsewhere"}</Pill>
                                        <span>slot</span>
                                        <Pill>{rule.targetSlot}</Pill>
                                    </>
                                )}
                                onDelete={onDeleteRoute}
                            />
                        )}
                    </Group>
                </>
            )}

            {match && (
                <Group className="w-[380px] border-r-0">
                    <MatchContents
                        tournamentId={tournamentId}
                        divisionId={division?.id}
                        match={match}
                        roster={roster}
                        draft={draft}
                        onSeat={onSeat}
                        onSetSongs={onSetSongs}
                    />
                </Group>
            )}
        </div>
    );
}

function MatchContents({
    tournamentId,
    divisionId,
    match,
    roster,
    draft,
    onSeat,
    onSetSongs,
}: {
    tournamentId: number;
    divisionId: number | undefined;
    match: Match;
    roster: Entrant[];
    draft: StructureDraft;
    onSeat: (matchId: number, entrantIds: number[]) => void;
    onSetSongs: (matchId: number, songIds: number[]) => void;
}) {
    const [tab, setTab] = useState<"players" | "songs">("players");
    const [rolling, setRolling] = useState(false);

    const songs = useQuery({
        queryKey: songKeys.forTournament(tournamentId),
        enabled: tab === "songs",
        queryFn: () => listSongs(tournamentId),
    });
    const catalogue = useMemo(() => songs.data ?? [], [songs.data]);
    const songGroups = useMemo(() => [...new Set(catalogue.map((song) => song.group))], [catalogue]);

    const roll = useSongRoll({
        open: rolling,
        divisionId,
        matchId: match.id > 0 ? match.id : undefined,
        tournamentId,
        songGroups,
    });

    const seated = seatingOf(draft, match.id) ?? (match.entrants ?? []).map((entrant) => entrant.id);
    const options = roster
        .filter((entrant) => entrant.status === "active" && entrant.type === "player")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((entrant) => ({ value: entrant.id, label: entrant.name }));

    const drafted = songsOf(draft, match.id);
    const played = (match.rounds ?? []).filter((round) => round.song && !drafted.includes(round.song.id));
    const titleOf = (songId: number) => {
        const song = catalogue.find((candidate) => candidate.id === songId);

        return song ? displaySongTitle(song.title) : `Song ${songId}`;
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <span className="inline-flex overflow-hidden rounded-lg border border-ui-border">
                    {(
                        [
                            { key: "players", label: "Players" },
                            { key: "songs", label: "Songs" },
                        ] as const
                    ).map((choice) => (
                        <button
                            key={choice.key}
                            type="button"
                            onClick={() => setTab(choice.key)}
                            className={`${focusRing} px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${
                                tab === choice.key ? "bg-ui-selected text-ui-text" : "text-ui-text-mute"
                            }`}
                        >
                            {choice.label}
                        </button>
                    ))}
                </span>
                <span className="text-[11px] text-ui-text-mute">{tab === "players" ? `${seated.length} seated` : `${played.length + drafted.length} songs`}</span>
            </div>

            {tab === "players" ? (
                <>
                    <MultiSelect
                        options={options}
                        value={seated.map((id) => options.find((option) => option.value === id)).filter((option): option is { value: number; label: string } => Boolean(option))}
                        onChange={(chosen) => onSeat(match.id, chosen.map((option) => option.value))}
                        placeholder="Add players…"
                    />
                    {options.length === 0 && <Empty>This division has no active players yet.</Empty>}
                </>
            ) : (
                <div className="flex flex-col gap-2">
                    <MultiSelect
                        options={catalogue.map((song) => ({ value: song.id, label: displaySongTitle(song.title) }))}
                        value={drafted.map((id) => ({ value: id, label: titleOf(id) }))}
                        onChange={(chosen) => onSetSongs(match.id, chosen.map((option) => option.value))}
                        placeholder="Add songs by title…"
                    />
                    {played.length > 0 && (
                        <p className="text-[11px] text-ui-text-mute">Already on: {played.map((round) => titleOf(round.song!.id)).join(", ")}</p>
                    )}
                    <button type="button" onClick={() => setRolling(true)} className={`${btnSecondary} w-fit text-xs`}>
                        <FontAwesomeIcon icon={faDice} className="mr-1.5 text-[10px]" />
                        Roll…
                    </button>
                </div>
            )}

            <BaseModal
                open={rolling}
                onClose={() => setRolling(false)}
                title={`Roll songs for ${match.name}`}
                fitViewport
                footer={
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setRolling(false)} className={btnSecondary}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={roll.drawnSongIds.length === 0}
                            onClick={() => {
                                onSetSongs(match.id, [...new Set([...drafted, ...roll.drawnSongIds])]);
                                setRolling(false);
                            }}
                            className={btnPrimary}
                        >
                            Take the draw
                        </button>
                    </div>
                }
            >
                <SongRollPanel roll={roll} songGroups={songGroups} />
            </BaseModal>
        </>
    );
}

function Group({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`flex shrink-0 flex-col gap-2 border-r border-ui-separator p-3.5 ${className}`}>{children}</div>;
}

function Section({ label }: { label: string }) {
    return <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ui-text-mute">{label}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
    return <p className="text-[12px] text-ui-text-mute">{children}</p>;
}

function Crumb({ children }: { children: React.ReactNode }) {
    return (
        <>
            <span className="px-1 text-ui-text-mute">·</span>
            {children}
        </>
    );
}

function Pill({ children }: { children: React.ReactNode }) {
    return <span className="rounded-md border border-ui-border bg-ui-raised px-1.5 text-[12px] font-semibold text-ui-text">{children}</span>;
}

function RouteList({
    routes,
    render,
    onDelete,
}: {
    routes: AdvancementRuleDto[];
    render: (rule: AdvancementRuleDto) => React.ReactNode;
    onDelete: (targetKind: "pool" | "match", targetId: number, slot: number) => void;
}) {
    return (
        <div className="flex flex-col gap-1">
            {routes.map((rule) => (
                <div key={`${rule.targetKind}:${rule.targetId}:${rule.targetSlot}`} className="flex flex-wrap items-center gap-1.5 text-[12px] text-ui-text-mute">
                    {render(rule)}
                    <button
                        type="button"
                        aria-label="Remove this route"
                        onClick={() => onDelete(rule.targetKind === "phase_group" ? "pool" : "match", rule.targetId, rule.targetSlot)}
                        className={`${focusRing} ml-auto text-ui-text-mute hover:text-state-failed`}
                    >
                        <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                    </button>
                </div>
            ))}
        </div>
    );
}

function selectedName(division: TournamentDivisionOption | undefined, matches: Match[], selection: CanvasSelection): string | undefined {
    if (!selection) {
        return undefined;
    }
    if (selection.kind === "phase") {
        return division?.phases.find((phase) => phase.id === selection.id)?.name;
    }
    if (selection.kind === "pool") {
        return poolOf(division, matches, selection)?.name;
    }

    return matches.find((match) => match.id === selection.id)?.name;
}

function phaseOf(division: TournamentDivisionOption | undefined, matches: Match[], selection: CanvasSelection): TournamentDivisionOptionPhase | undefined {
    const pool = poolOf(division, matches, selection);

    return division?.phases.find((phase) => (phase.phaseGroups ?? []).some((candidate) => candidate.id === pool?.id));
}

function poolOf(division: TournamentDivisionOption | undefined, matches: Match[], selection: CanvasSelection) {
    if (!selection || selection.kind === "phase") {
        return undefined;
    }
    const poolId = selection.kind === "pool" ? selection.id : matches.find((match) => match.id === selection.id)?.phaseGroupId;

    return division?.phases.flatMap((phase) => phase.phaseGroups ?? []).find((pool) => pool.id === poolId);
}
