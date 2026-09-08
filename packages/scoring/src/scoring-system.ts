import type { ScoringStanding } from './scoring-standing';
import type { ScoringSystemType } from './scoring-system-type';

export interface ScoringSystem {
  getName(): ScoringSystemType;
  getDescription(): string;
  recalc(standings: ScoringStanding[]): void;
}
