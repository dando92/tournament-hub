import { entrantPlayers } from "@/features/participant/model/entrant";
import { Match } from "@/features/match/model/types";

export function matchMatchesQuery(match: Match, query: string, poolName: string, phaseName: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    match.name,
    match.subtitle,
    poolName,
    phaseName,
    ...match.rounds.flatMap((round) => (round.song ? [round.song.title] : [])),
    ...entrantPlayers(match.entrants).map((player) => player.playerName),
    ...match.entrants.map((entrant) => entrant.name),
  ];

  return haystack.some((value) => value?.toLowerCase().includes(needle));
}
