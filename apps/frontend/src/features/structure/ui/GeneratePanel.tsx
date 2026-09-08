import { useMemo, useState } from "react";
import type { BracketPlan, BracketType } from "@tournament-hub/brackets";

import Select from "@/shared/components/ui/Select";
import { btnPrimary, btnSecondary, focusRing } from "@/styles/buttonStyles";
import { bracketTypes, generateBracket } from "@/features/structure/model/bracketCatalogue";
import { formatBracketType } from "@/features/division/model/bracketType";
import type { BracketRequest } from "@/features/structure/model/structureDraft";
import type { TournamentDivisionOption } from "@/features/tournament/model/types";

type Props = {
    division: TournamentDivisionOption;
    onAdd: (request: BracketRequest) => void;
    onClose: () => void;
};

export default function GeneratePanel({ division, onAdd, onClose }: Props) {
    const types = useMemo(bracketTypes, []);
    const [bracketType, setBracketType] = useState<BracketType>(types[0]);
    const [phaseName, setPhaseName] = useState("");
    const [playerPerMatch, setPlayerPerMatch] = useState(2);
    const [players, setPlayers] = useState(division.entrantCount);

    const suggested = `Bracket ${division.phases.length + 1}`;
    const generated = useMemo(() => attempt(bracketType, players, playerPerMatch), [bracketType, players, playerPerMatch]);

    const matchCount = generated.bracket?.matches.length ?? 0;
    const routeCount = generated.bracket?.routes.length ?? 0;

    return (
        <div className="flex max-h-[46%] shrink-0 overflow-y-auto rounded-xl border border-ui-border bg-ui-surface shadow-card">
            <Group className="w-[240px]">
                <Label htmlFor="generate-phase-name">Generate</Label>
                <input
                    id="generate-phase-name"
                    data-autofocus
                    value={phaseName}
                    placeholder={suggested}
                    onChange={(event) => setPhaseName(event.target.value)}
                    className={`w-full rounded-lg border border-ui-border-strong bg-ui-surface px-2 py-1.5 text-sm font-semibold text-ui-text outline-none ${focusRing}`}
                />
                <span className="text-[11px] text-ui-text-mute">a new phase, at the end</span>
            </Group>

            <Group className="w-[220px]">
                <Label htmlFor="generate-shape">Shape</Label>
                <Select
                    inputId="generate-shape"
                    value={bracketType}
                    onChange={(type) => setBracketType(type as BracketType)}
                    options={types.map((type) => ({ value: type, label: formatBracketType(type) ?? type }))}
                />
            </Group>

            <Group className="w-[210px]">
                <Label htmlFor="generate-players">Players</Label>
                <div className="flex items-center gap-2">
                    <input
                        id="generate-players"
                        type="number"
                        min={2}
                        value={players}
                        onChange={(event) => setPlayers(Number(event.target.value))}
                        className={`w-20 rounded-lg border border-ui-border-strong bg-ui-surface px-2 py-1.5 text-sm font-semibold text-ui-text outline-none ${focusRing}`}
                    />
                    <span className="text-[11px] text-ui-text-mute">
                        {division.entrantCount} entered
                        {players !== division.entrantCount && (
                            <>
                                {" · "}
                                <button type="button" onClick={() => setPlayers(division.entrantCount)} className={`${focusRing} underline`}>
                                    use {division.entrantCount}
                                </button>
                            </>
                        )}
                    </span>
                </div>
                <span className="text-[11px] text-ui-text-mute">
                    {players > division.entrantCount ? `${players - division.entrantCount} seats still to fill` : "every seat has somebody"}
                </span>
            </Group>

            <Group className="w-[160px]">
                <Label htmlFor="generate-per-match">Per match</Label>
                <input
                    id="generate-per-match"
                    type="number"
                    min={2}
                    value={playerPerMatch}
                    onChange={(event) => setPlayerPerMatch(Number(event.target.value))}
                    className={`w-20 rounded-lg border border-ui-border-strong bg-ui-surface px-2 py-1.5 text-sm font-semibold text-ui-text outline-none ${focusRing}`}
                />
            </Group>

            <Group className="min-w-[220px] flex-1">
                <Label>This will add</Label>
                {generated.error ? (
                    <p className="text-[12px] text-state-failed">{generated.error}</p>
                ) : (
                    <div className="flex flex-col gap-1 text-[12px] text-ui-text-mute">
                        <span>
                            <Val>1</Val> phase <Val>1</Val> pool <Val>{matchCount}</Val> {matchCount === 1 ? "match" : "matches"}
                        </span>
                        <span>
                            <Val>{routeCount}</Val> {routeCount === 1 ? "route" : "routes"} <Val>{generated.bracket?.byes ?? 0}</Val>{" "}
                            {generated.bracket?.byes === 1 ? "bye" : "byes"}
                        </span>
                    </div>
                )}
                <span className="text-[11px] text-ui-text-mute">It arrives dashed, and nothing is written until Commit.</span>
            </Group>

            <Group className="w-[200px] border-r-0">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onClose} className={`${btnSecondary} text-xs`}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!generated.bracket || matchCount === 0}
                        onClick={() => {
                            if (!generated.bracket) {
                                return;
                            }
                            onAdd({ phaseName: phaseName.trim() || suggested, poolName: "Bracket", bracket: generated.bracket });
                            onClose();
                        }}
                        className={`${btnPrimary} text-xs`}
                    >
                        Add to draft
                    </button>
                </div>
            </Group>
        </div>
    );
}

function Group({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`flex shrink-0 flex-col gap-2 border-r border-ui-separator p-3.5 ${className}`}>{children}</div>;
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
    return (
        <label htmlFor={htmlFor} className="text-[11px] font-bold uppercase tracking-[0.12em] text-ui-text-mute">
            {children}
        </label>
    );
}

function Val({ children }: { children: React.ReactNode }) {
    return <span className="rounded-md border border-ui-border bg-ui-raised px-1.5 text-[12px] font-semibold text-ui-text">{children}</span>;
}

function attempt(bracketType: BracketType, entrantCount: number, playerPerMatch: number): { bracket: BracketPlan | null; error: string | null } {
    try {
        return { bracket: generateBracket(bracketType, entrantCount, playerPerMatch), error: null };
    } catch (failure) {
        return { bracket: null, error: failure instanceof Error ? failure.message : "That bracket cannot be built." };
    }
}
