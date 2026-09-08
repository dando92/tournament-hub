import {
    type BracketMatchNamer,
    type BracketPlan,
    type BracketPlanMatch,
    type BracketPlanRoute,
    type BracketPlanSeat,
    type BracketRoundKind,
    defaultMatchName,
} from './bracket-plan';
import type { BracketType } from './bracket-type';

export class BracketPlanBuilder {
    private readonly matches: BracketPlanMatch[] = [];
    private readonly routes: BracketPlanRoute[] = [];
    private readonly seats: BracketPlanSeat[] = [];

    constructor(private readonly name: BracketMatchNamer = defaultMatchName) {}

    addRound(kind: BracketRoundKind, roundIndex: number, roundCount: number, matchCount: number, round: string): string[] {
        const localIds: string[] = [];
        for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
            const localId = `m${this.matches.length}`;
            const name = this.name({ kind, roundIndex, roundCount, matchIndex, matchCount });
            this.matches.push({ localId, name, round });
            localIds.push(localId);
        }

        return localIds;
    }

    addRoute(sourceMatchLocalId: string, sourcePlacementIndex: number, targetMatchLocalId: string, targetSlotIndex: number): void {
        this.routes.push({
            sourceMatchLocalId,
            sourcePlacement: sourcePlacementIndex + 1,
            targetMatchLocalId,
            targetSlot: targetSlotIndex + 1,
        });
    }

    seatFirstWave(firstRound: string[], entrantCount: number, playerPerMatch: number): void {
        for (let seedIndex = 0; seedIndex < entrantCount; seedIndex++) {
            const matchIndex = Math.floor(seedIndex / playerPerMatch);
            if (matchIndex >= firstRound.length) {
                continue;
            }
            this.seats.push({ matchLocalId: firstRound[matchIndex], slot: (seedIndex % playerPerMatch) + 1, seedIndex });
        }
    }

    build(bracketType: BracketType, entrantCount: number, playerPerMatch: number, byes: number): BracketPlan {
        return {
            bracketType,
            playerPerMatch,
            entrantCount,
            byes,
            matches: this.matches,
            routes: this.routes,
            seats: this.seats,
        };
    }
}
