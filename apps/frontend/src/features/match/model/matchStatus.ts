import { entrantPlayers } from "@/features/participant/model/entrant";
import { canCreateTiebreak } from "@/features/match/model/tiebreaks";
import type { Match, MatchCommitState, Round } from "@/features/match/model/types";
import type { Player } from "@/features/participant/model/types";
import type { Status } from "@/shared/components/ui/status";

function isRoundSettled(round: Round, players: Player[]): boolean {
  if (round.song === null) return (round.standings ?? []).some((standing) => standing.points > 0);
  return players.every((player) => (round.standings ?? []).some((standing) => standing.player.id === player.id));
}

function roundHasContent(round: Round): boolean {
  if (round.song === null) return (round.standings ?? []).some((standing) => standing.points > 0);
  return (round.standings ?? []).length > 0;
}

export function handScoredRoundOf(match: Match): Round | null {
  return match.rounds.find((round) => round.song === null) ?? null;
}

export function hasAllStandings(match: Match): boolean {
  const players = entrantPlayers(match.entrants);
  if (players.length === 0 || match.rounds.length === 0) return false;

  return match.rounds.every((round) => isRoundSettled(round, players));
}

export type MatchProgress = "empty" | "started" | "tiebreakRequired" | "tiebreakInProgress" | "readyToCommit" | "completed";

const PROGRESS_STATUS: Record<MatchProgress, Status> = {
  empty: "idle",
  started: "running",
  tiebreakRequired: "pending",
  tiebreakInProgress: "pending",
  readyToCommit: "pending",
  completed: "done",
};

const PROGRESS_LABEL: Record<MatchProgress, string> = {
  empty: "Empty",
  started: "In progress",
  tiebreakRequired: "Tiebreak required",
  tiebreakInProgress: "Tiebreak in progress",
  readyToCommit: "Ready to commit",
  completed: "Completed",
};

export function getMatchProgress(match: Match): MatchProgress {
  if (match.matchResult) return "completed";
  if (match.resultState.status === "tiebreak_required") {
    return canCreateTiebreak(match) ? "tiebreakRequired" : "tiebreakInProgress";
  }
  if (match.resultState.status === "ready") return "readyToCommit";
  if (match.rounds.length === 0) return "empty";

  return match.rounds.some(roundHasContent) ? "started" : "empty";
}

export function getMatchProgressStatus(progress: MatchProgress): Status {
  return PROGRESS_STATUS[progress];
}

export function getMatchProgressLabel(progress: MatchProgress): string {
  return PROGRESS_LABEL[progress];
}

export function getMatchCommitState(match: Match): MatchCommitState {
  const progress = getMatchProgress(match);
  if (progress === "completed") return "Completed";
  if (progress === "tiebreakRequired" || progress === "tiebreakInProgress") return "Tiebreak";
  return progress === "readyToCommit" ? "Pending" : "Disabled";
}

export function getCommitBlocker(match: Match): string | null {
  if (getMatchCommitState(match) !== "Disabled") return null;

  const players = entrantPlayers(match.entrants);
  if (players.length === 0) return "No players yet";
  if (match.rounds.length === 0) return "No songs yet";

  if (handScoredRoundOf(match)) return "No points assigned";

  const missing = match.rounds.reduce(
    (count, round) =>
      count +
      players.filter((player) => !(round.standings ?? []).some((standing) => standing.player.id === player.id))
        .length,
    0,
  );
  return `${missing} score${missing !== 1 ? "s" : ""} missing`;
}

export function getActiveLabel(active: boolean): string {
  return active ? "Match active" : "Match not active";
}
