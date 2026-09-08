import type { AdvancementRuleDto, MatchState } from "@tournament-hub/contracts";

export type {
  AdvancementCompetitionKind,
  MatchState,
  MatchSummaryDto as MatchSummary,
  AdvancementRuleDto as AdvancementRule,
  MatchDto as Match,
  MatchRoundDto as Round,
  ScoreDto as Score,
  CommitMatchResultResponseDto as CommitMatchResultResponse,
} from "@tournament-hub/contracts";

export type MatchCommitState = "Disabled" | "Tiebreak" | "Pending" | "Completed";

export type MatchNeighbour = {
  id: number;
  name: string;
  phaseGroupId: number;
  state: MatchState;
};

export type AdvancementRuleInput = Pick<
  AdvancementRuleDto,
  "sourcePlacement" | "targetKind" | "targetId" | "targetSlot"
>;
export type MatchAdvancementRuleInput = AdvancementRuleInput;

export type MatchHighlight = {
  matchId: number | null;
  phaseGroupId: number | null;
};

export interface CreateMatchRequest {
  phaseGroupId: number;
  name: string;
  subtitle: string;
  scoringSystem: string;
  notes: string;
  group: string;
  levels: string;
  songIds: number[];
  entrantIds: number[];
}

export interface RoundSourceRequest {
  songId?: number;
  group?: string;
  level?: string;
}
