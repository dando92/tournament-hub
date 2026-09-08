import type { QueryKey } from "@tanstack/react-query";
import { matchKeys } from "@/features/match/api/match.keys";
import { divisionKeys } from "@/features/division/api/division.keys";
import { participantKeys } from "@/features/participant/api/participant.keys";
import { songKeys } from "@/features/song/api/song.keys";
import { tournamentKeys } from "@/features/tournament/api/tournament.keys";
import { scheduleKeys } from "@/features/schedule/api/schedule.keys";

type TournamentUpdateMessage = {
  tournamentId: number;
};

type DivisionUpdateMessage = {
  tournamentId: number;
  divisionId: number;
};

type PhaseUpdateMessage = {
  tournamentId: number;
  divisionId: number;
  phaseId: number;
};

type PhaseGroupUpdateMessage = {
  tournamentId: number;
  divisionId: number;
  phaseId: number;
  phaseGroupId: number;
};

type MatchUpdateMessage = {
  tournamentId: number;
  divisionId: number;
  phaseId: number;
  phaseGroupId: number;
  matchId: number;
};

type UiWarningMessage = {
  tournamentId: number;
  message: string;
};

type ScheduleUpdateMessage = {
  tournamentId: number;
  scheduleId: number;
};

export type TournamentSocketMessage =
  | { event: "TournamentUpdate"; data: TournamentUpdateMessage }
  | { event: "SongsUpdate"; data: TournamentUpdateMessage }
  | { event: "DivisionUpdate"; data: DivisionUpdateMessage }
  | { event: "PhaseUpdate"; data: PhaseUpdateMessage }
  | { event: "PhaseGroupUpdate"; data: PhaseGroupUpdateMessage }
  | { event: "MatchUpdate"; data: MatchUpdateMessage }
  | { event: "ScheduleUpdate"; data: ScheduleUpdateMessage }
  | { event: "UiWarning"; data: UiWarningMessage };

export function staleAfterUpdate(message: TournamentSocketMessage): QueryKey[] {
  switch (message.event) {
    case "TournamentUpdate":
      return [
        tournamentKeys.overview(message.data.tournamentId),
        tournamentKeys.configuration(message.data.tournamentId),
        participantKeys.forTournament(message.data.tournamentId),
        participantKeys.players(),
      ];
    case "SongsUpdate":
      return [songKeys.forTournament(message.data.tournamentId)];
    case "DivisionUpdate":
      return [
        tournamentKeys.overview(message.data.tournamentId),
        divisionKeys.summary(message.data.divisionId),
        divisionKeys.entrants(message.data.divisionId),
      ];
    case "PhaseUpdate":
      return [
        tournamentKeys.overview(message.data.tournamentId),
        divisionKeys.summary(message.data.divisionId),
      ];
    case "PhaseGroupUpdate":
      return [
        tournamentKeys.overview(message.data.tournamentId),
        divisionKeys.summary(message.data.divisionId),
        matchKeys.byPhaseGroup(message.data.phaseGroupId),
        matchKeys.byDivision(message.data.divisionId),
      ];
    case "MatchUpdate":
      return [
        matchKeys.byId(message.data.matchId),
        matchKeys.byPhaseGroup(message.data.phaseGroupId),
        matchKeys.byDivision(message.data.divisionId),
        ...scheduleKeys.lists(message.data.tournamentId),
      ];
    case "ScheduleUpdate":
      return [
        ...scheduleKeys.lists(message.data.tournamentId),
        scheduleKeys.activity(message.data.tournamentId),
        scheduleKeys.editor(message.data.scheduleId),
      ];
    default:
      return [];
  }
}
