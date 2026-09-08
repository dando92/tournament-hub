const SCORING_SYSTEM_LABELS: Record<string, string> = {
    PlacementPointsWithFailZero: "Placement points (fails score zero)",
    PlacementPointsIncludingFails: "Placement points (fails included)",
    RoundWinner: "Round winner",
};

export function scoringSystemLabel(scoringSystem: string): string {
    return SCORING_SYSTEM_LABELS[scoringSystem] ?? scoringSystem;
}
