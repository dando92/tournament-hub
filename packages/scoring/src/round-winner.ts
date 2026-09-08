import type { ScoringStanding } from "./scoring-standing";
import type { ScoringSystem } from "./scoring-system";

export class RoundWinner implements ScoringSystem {
    getName(): "RoundWinner" {
        return "RoundWinner";
    }

    getDescription(): string {
        return "One point for the round's highest percentage";
    }

    recalc(standings: ScoringStanding[]): void {
        const orderedStandings = standings.sort((left, right) => Number(right.score.percentage) - Number(left.score.percentage));
        orderedStandings.forEach((standing, index) => {
            standing.points = index === 0 ? 1 : 0;
        });
    }
}
