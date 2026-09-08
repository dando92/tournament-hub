import type { MatchDto, MatchSummaryDto, PlayerRefDto } from "@tournament-hub/contracts";

import { entrantPlayers } from "@/features/participant/model/entrant";
import { getCommitBlocker, getMatchProgress, type MatchProgress } from "@/features/match/model/matchStatus";

export type MatchRowModel = {
    id: number;
    name: string;
    subtitle: string;
    active: boolean;
    progress: MatchProgress;
    blocker: string | null;
    playerCount: number;
    songCount: number;
    handScored: boolean;
};

export function summaryPlayers(match: MatchSummaryDto): PlayerRefDto[] {
    return (match.entrants ?? [])
        .map((entrant) => entrant.player)
        .filter((player): player is PlayerRefDto => Boolean(player));
}

export function rowOfSummary(match: MatchSummaryDto): MatchRowModel {
    const playerCount = summaryPlayers(match).length;
    const progress = progressOfState(match);

    return {
        id: match.id,
        name: match.name,
        subtitle: match.subtitle,
        active: match.active,
        progress,
        blocker: blockerOf(progress, playerCount, match.songCount, match.handScored, match.missingScoreCount),
        playerCount,
        songCount: match.songCount,
        handScored: match.handScored,
    };
}

export function rowOfMatch(match: MatchDto): MatchRowModel {
    const players = entrantPlayers(match.entrants);

    return {
        id: match.id,
        name: match.name,
        subtitle: match.subtitle,
        active: match.active,
        progress: getMatchProgress(match),
        blocker: getCommitBlocker(match),
        playerCount: players.length,
        songCount: match.rounds.filter((round) => round.song !== null).length,
        handScored: match.rounds.some((round) => round.song === null),
    };
}

function progressOfState(match: MatchSummaryDto): MatchProgress {
    if (match.state === "completed") {
        return "completed";
    }
    if (match.state === "ready") {
        return "readyToCommit";
    }
    if (match.state === "tiebreak_required") {
        return match.tiebreakInProgress ? "tiebreakInProgress" : "tiebreakRequired";
    }

    return match.state === "partial" ? "started" : "empty";
}

function blockerOf(progress: MatchProgress, playerCount: number, songCount: number, handScored: boolean, missingScoreCount: number): string | null {
    if (progress !== "empty" && progress !== "started") {
        return null;
    }
    if (playerCount === 0) {
        return "No players yet";
    }
    if (songCount === 0 && !handScored) {
        return "No songs yet";
    }
    if (handScored) {
        return "No points assigned";
    }

    return `${missingScoreCount} score${missingScoreCount !== 1 ? "s" : ""} missing`;
}
