import { type BracketPlan, type BracketPlanInput, nextPow2 } from './bracket-plan';
import { BracketPlanBuilder } from './bracket-plan-builder';
import type { BracketGenerator } from './bracket-generator';

type PlayerInfo = {
    match: number;
    playerIndexInMatch: number;
};

export class SingleElimination implements BracketGenerator {
    readonly type = 'SingleElimination' as const;

    generate(input: BracketPlanInput): BracketPlan {
        const playerPerMatch = input.playerPerMatch ?? 2;
        if (playerPerMatch < 2) {
            throw new Error(`A match holds at least two players, got ${playerPerMatch}`);
        }

        const builder = new BracketPlanBuilder(input.name);
        const effectiveCount = playerPerMatch * nextPow2(Math.ceil(input.entrantCount / playerPerMatch));
        const byes = effectiveCount - input.entrantCount;

        const firstRound = this.buildStructure(builder, effectiveCount, playerPerMatch);
        builder.seatFirstWave(firstRound, input.entrantCount, playerPerMatch);

        return builder.build(this.type, input.entrantCount, playerPerMatch, byes);
    }

    private buildStructure(builder: BracketPlanBuilder, effectiveCount: number, playerPerMatch: number): string[] {
        let count = effectiveCount;
        let matchCount = count / playerPerMatch;
        const roundCount = Math.log2(effectiveCount / playerPerMatch) + 1;
        let indexes: PlayerInfo[][] | null = null;
        let currentMatches: string[] | null = null;
        let firstRound: string[] | null = null;
        let roundIndex = 0;

        while (matchCount >= 1) {
            const nextMatches = builder.addRound('single', roundIndex, roundCount, matchCount, `Round ${roundIndex + 1}`);

            firstRound ??= nextMatches;

            if (currentMatches !== null && indexes !== null) {
                for (let i = 0; i < nextMatches.length; i++) {
                    for (let j = 0; j < playerPerMatch; j++) {
                        const currentIndex = indexes[i][j];
                        builder.addRoute(currentMatches[currentIndex.match], currentIndex.playerIndexInMatch, nextMatches[i], j);
                    }
                }
            }

            if (matchCount > 1) {
                indexes = this.getIndexes(count, playerPerMatch);
            }

            currentMatches = nextMatches;
            count /= 2;
            matchCount = count / playerPerMatch;
            roundIndex += 1;
        }

        if (playerPerMatch > 2 && currentMatches !== null) {
            const finals = builder.addRound('final', roundIndex, roundIndex + 1, 2, 'Finals');
            const passingPlayers = Math.floor(playerPerMatch / 2);

            for (let placement = 0; placement < passingPlayers; placement++) {
                builder.addRoute(currentMatches[0], placement, finals[0], placement);
            }
            for (let placement = passingPlayers; placement < playerPerMatch; placement++) {
                builder.addRoute(currentMatches[0], placement, finals[1], placement - passingPlayers);
            }
        }

        return firstRound ?? [];
    }

    private getIndexes(playerCount: number, playerPerMatch: number): PlayerInfo[][] {
        return playerPerMatch > 2 ? this.leastRematchIndexes(playerCount, playerPerMatch) : this.directMatchIndexes(playerCount, playerPerMatch);
    }

    private leastRematchIndexes(playerCount: number, playerPerMatch: number): PlayerInfo[][] {
        const final: PlayerInfo[][] = [];
        const matchCount = playerCount / playerPerMatch;
        const passingPlayers = playerPerMatch / 2;

        for (let i = 0; i < matchCount / 2; i++) {
            final[i] = [];
        }

        for (let j = 0; j < passingPlayers; j++) {
            let k = j % 2 === 0 ? 0 : matchCount / 2 - 1;
            const increment = j % 2 === 0 ? 1 : -1;
            let counter = passingPlayers;
            for (let i = 0; i < matchCount; i++) {
                final[k].push({ match: i, playerIndexInMatch: j });

                if (--counter <= 0) {
                    counter = passingPlayers;
                    k += increment;
                }
            }
        }

        return final;
    }

    private directMatchIndexes(playerCount: number, playerPerMatch: number): PlayerInfo[][] {
        const final: PlayerInfo[][] = [];
        const matchCount = playerCount / playerPerMatch;

        for (let i = 0; i < matchCount / 2; i++) {
            final[i] = [];
        }

        let k = 0;
        let counter = playerPerMatch;

        for (let i = 0; i < matchCount; i++) {
            final[k].push({ match: i, playerIndexInMatch: 0 });

            if (--counter <= 0) {
                counter = playerPerMatch;
                k += 1;
            }
        }

        return final;
    }
}
