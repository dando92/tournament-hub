import { type BracketPlan, type BracketPlanInput, nextPow2 } from './bracket-plan';
import { BracketPlanBuilder } from './bracket-plan-builder';
import type { BracketGenerator } from './bracket-generator';

export class DoubleElimination implements BracketGenerator {
    readonly type = 'DoubleElimination' as const;

    generate(input: BracketPlanInput): BracketPlan {
        const playerPerMatch = input.playerPerMatch ?? 2;
        if (playerPerMatch !== 2 && playerPerMatch !== 4 && playerPerMatch !== 8) {
            throw new Error(`Double elimination only supports 2, 4 or 8 players per match, got ${playerPerMatch}`);
        }

        const builder = new BracketPlanBuilder(input.name);
        const firstRoundMatchCount = Math.max(2, nextPow2(Math.ceil(input.entrantCount / playerPerMatch)));
        const effectiveCount = playerPerMatch * firstRoundMatchCount;
        const byes = effectiveCount - input.entrantCount;

        const firstRound = this.buildStructure(builder, firstRoundMatchCount, playerPerMatch);
        builder.seatFirstWave(firstRound, input.entrantCount, playerPerMatch);

        return builder.build(this.type, input.entrantCount, playerPerMatch, byes);
    }

    private buildStructure(builder: BracketPlanBuilder, firstRoundMatchCount: number, playerPerMatch: number): string[] {
        const passingPlayers = playerPerMatch / 2;
        const winnersRoundCount = Math.log2(firstRoundMatchCount) + 1;

        const winnersRounds: string[][] = [];
        let winnersMatchCount = firstRoundMatchCount;
        for (let k = 0; k < winnersRoundCount; k++) {
            winnersRounds.push(builder.addRound('winners', k, winnersRoundCount, winnersMatchCount, `Winners round ${k + 1}`));
            winnersMatchCount = Math.floor(winnersMatchCount / 2);
        }

        const losersRoundCount = 2 * (winnersRoundCount - 1);
        const losersRounds: string[][] = [];
        let losersMatchCount = Math.floor(firstRoundMatchCount / 2);
        for (let i = 0; i < losersRoundCount; i++) {
            const isDropRound = i % 2 === 1;
            const label = `Losers ${isDropRound ? 'drop' : 'merge'} ${Math.floor(i / 2) + 1}`;
            losersRounds.push(builder.addRound('losers', i, losersRoundCount, losersMatchCount, label));
            if (isDropRound) {
                losersMatchCount = Math.floor(losersMatchCount / 2);
            }
        }

        const grandFinal = builder.addRound('final', 0, 1, 1, 'Grand final')[0];

        for (let k = 0; k < winnersRoundCount; k++) {
            const round = winnersRounds[k];
            for (let m = 0; m < round.length; m++) {
                const match = round[m];
                const winnerDestination = k < winnersRoundCount - 1 ? winnersRounds[k + 1][Math.floor(m / 2)] : grandFinal;
                const loserDestination = k === 0 ? losersRounds[0][Math.floor(m / 2)] : losersRounds[2 * k - 1][m];

                const winnerBaseSlot = (m % 2) * passingPlayers;
                const firstLoserRoundBaseSlot = (m % 2) * passingPlayers;
                const dropLoserBaseSlot = passingPlayers;

                for (let p = 0; p < passingPlayers; p++) {
                    builder.addRoute(match, p, winnerDestination, winnerBaseSlot + p);
                    builder.addRoute(match, passingPlayers + p, loserDestination, (k === 0 ? firstLoserRoundBaseSlot : dropLoserBaseSlot) + p);
                }
            }
        }

        for (let i = 0; i < losersRounds.length; i++) {
            const round = losersRounds[i];
            const isLast = i === losersRounds.length - 1;

            for (let m = 0; m < round.length; m++) {
                const match = round[m];
                const winnerDestination = isLast ? grandFinal : i % 2 === 0 ? losersRounds[i + 1][m] : losersRounds[i + 1][Math.floor(m / 2)];
                const targetBaseSlot = isLast ? passingPlayers : i % 2 === 0 ? 0 : (m % 2) * passingPlayers;

                for (let p = 0; p < passingPlayers; p++) {
                    builder.addRoute(match, p, winnerDestination, targetBaseSlot + p);
                }
            }
        }

        return winnersRounds[0];
    }
}
