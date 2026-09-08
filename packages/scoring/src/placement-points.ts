import type { ScoringStanding } from "./scoring-standing";

export function awardPlacementPoints(standings: ScoringStanding[], includeFails: boolean): void {
    standings.forEach((standing) => {
        standing.points = 0;
    });

    let points = standings.length;
    const ranked = standings
        .filter((standing) => includeFails || !standing.score.isFailed)
        .sort((left, right) => Number(right.score.percentage) - Number(left.score.percentage));

    for (let index = 0; index < ranked.length; ) {
        const percentage = Number(ranked[index].score.percentage);
        let nextIndex = index + 1;
        while (nextIndex < ranked.length && Number(ranked[nextIndex].score.percentage) === percentage) {
            nextIndex += 1;
        }

        for (let tiedIndex = index; tiedIndex < nextIndex; tiedIndex += 1) {
            ranked[tiedIndex].points = points;
        }

        points -= nextIndex - index;
        index = nextIndex;
    }
}
