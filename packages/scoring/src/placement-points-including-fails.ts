import { awardPlacementPoints } from "./placement-points";
import type { ScoringStanding } from "./scoring-standing";
import type { ScoringSystem } from "./scoring-system";

export class PlacementPointsIncludingFails implements ScoringSystem {
    getName(): "PlacementPointsIncludingFails" {
        return "PlacementPointsIncludingFails";
    }

    getDescription(): string {
        return "Descending placement points; failed scores remain eligible";
    }

    recalc(standings: ScoringStanding[]): void {
        awardPlacementPoints(standings, true);
    }
}
