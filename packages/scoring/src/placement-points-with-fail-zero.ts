import { awardPlacementPoints } from "./placement-points";
import type { ScoringStanding } from "./scoring-standing";
import type { ScoringSystem } from "./scoring-system";

export class PlacementPointsWithFailZero implements ScoringSystem {
    getName(): "PlacementPointsWithFailZero" {
        return "PlacementPointsWithFailZero";
    }

    getDescription(): string {
        return "Descending placement points; failed scores receive zero";
    }

    recalc(standings: ScoringStanding[]): void {
        awardPlacementPoints(standings, false);
    }
}
