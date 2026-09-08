import type { EntrantDto, PlayerRefDto } from "@tournament-hub/contracts";

export function entrantPlayer(entrant: EntrantDto): PlayerRefDto | null {
  if (entrant.type !== "player") return null;
  return entrant.participants?.[0]?.player ?? null;
}

export function entrantPlayers(entrants: EntrantDto[] = []): PlayerRefDto[] {
  return entrants.map(entrantPlayer).filter((player): player is PlayerRefDto => Boolean(player));
}
