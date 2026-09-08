import { PhaseGroup } from "@/features/division/model/types";

export type {
  TournamentDto as Tournament,
  TournamentRefDto as TournamentRef,
  TournamentConfigurationDto as TournamentConfiguration,
  ControlRoomKeyStatusDto as ControlRoomKeyStatus,
  IssuedControlRoomKeyDto as IssuedControlRoomKey,
  TournamentOverviewDto as TournamentOverview,
  StartggImportResponseDto as StartggImportResponse,
  StructurePlan,
  PlanNode,
  PlanNodeKind,
} from "@tournament-hub/contracts";

export type StartggImportMode = "create-division";

export type StartggImportPreviewRequest = {
  eventSlug: string;
  targetTournamentId?: number;
  mode?: StartggImportMode;
};

export interface TournamentDivisionOptionPhase {
  id: number;
  name: string;
  matchCount: number;
  phaseGroups?: PhaseGroup[];
}

export interface TournamentDivisionOption {
  id: number;
  name: string;
  structureVersion: number;
  entrantCount: number;
  phases: TournamentDivisionOptionPhase[];
}

