import { PlacementPointsIncludingFails } from './placement-points-including-fails';
import { PlacementPointsWithFailZero } from './placement-points-with-fail-zero';
import { RoundWinner } from './round-winner';
import type { ScoringSystem } from './scoring-system';
import {
  isScoringSystemType,
  type ScoringSystemType,
} from './scoring-system-type';

export class ScoringSystemProvider {
  private readonly systems: Map<ScoringSystemType, ScoringSystem>;

  constructor() {
    const systems: ScoringSystem[] = [
      new PlacementPointsWithFailZero(),
      new PlacementPointsIncludingFails(),
      new RoundWinner(),
    ];
    this.systems = new Map(systems.map((system) => [system.getName(), system]));
  }

  getScoringSystem(name: string): ScoringSystem | undefined {
    return isScoringSystemType(name) ? this.systems.get(name) : undefined;
  }

  getAll(): ScoringSystemType[] {
    return Array.from(this.systems.keys());
  }
}
