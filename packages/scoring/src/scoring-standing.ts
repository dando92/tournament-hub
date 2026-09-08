export interface ScoringStanding {
  points: number;
  score: {
    percentage: number;
    isFailed: boolean;
  };
}
