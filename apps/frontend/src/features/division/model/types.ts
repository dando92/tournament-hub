import type { AdvancementRuleInput } from "@/features/match/model/types";

export type {
  DivisionSummaryDto as Division,
  DivisionPhaseDto as Phase,
  PhaseGroupDto as PhaseGroup,
  PhaseGroupState,
  GenerateBracketResultDto,
} from "@tournament-hub/contracts";

export type PhaseGroupAdvancementRuleInput = AdvancementRuleInput;

export type GenerateBracketRequest = {
  divisionId: number;
  phaseId?: number;
  phaseName?: string;
  bracketType: string;
  playerPerMatch: number;
};
