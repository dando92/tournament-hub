import { Division } from './entities/division.entity';
import { Phase } from './entities/phase.entity';
import { Match } from './entities/match.entity';
import { MatchResult } from './entities/match_result.entity';
import { Player } from './entities/player.entity';
import { Round } from './entities/round.entity';

import { Tournament } from './entities/tournament.entity';
import { Score } from './entities/score.entity';
import { Song } from './entities/song.entity';
import { Standing } from './entities/standing.entity';
import { Account } from './entities/account.entity';
import { Participant } from './entities/participant.entity';
import { Entrant } from './entities/entrant.entity';
import { ExternalMapping } from './entities/external_mapping.entity';
import { AdvancementRule } from './entities/advancement-rule.entity';
import { PhaseGroup } from './entities/phase-group.entity';
import { PhaseGroupEntrant } from './entities/phase-group-entrant.entity';
import { Schedule } from './entities/schedule.entity';
import { ScheduleEntry } from './entities/schedule-entry.entity';
import { MatchTiebreak } from './entities/match-tiebreak.entity';
import { MatchTiebreakStanding } from './entities/match-tiebreak-standing.entity';
import { RunSubmission } from './entities/run-submission.entity';
export type { ParticipantRole, ParticipantStatus } from './entities/participant.entity';
export type { EntrantType, EntrantStatus } from './entities/entrant.entity';
export type { MatchState } from './entities/match.entity';
export type { MatchResultEntry } from './entities/match_result.entity';
export type { AdvancementCompetitionKind } from './entities/advancement-rule.entity';
export type { PhaseGroupState } from './entities/phase-group.entity';
export type { PhaseGroupEntrantStatus } from './entities/phase-group-entrant.entity';
export type { TournamentStatus } from './entities/tournament.entity';
export type { ChartDifficulty } from './entities/song.entity';
export type { ScoreSource } from './entities/score.entity';
export type { ScheduleStatus } from './entities/schedule.entity';
export type {
    ExternalProvider,
    ExternalMappingLocalType,
    ExternalMappingExternalType,
} from './entities/external_mapping.entity';

export { Division }
export { Phase }
export { Match }
export { MatchResult }
export { Player }
export { Round }

export { Tournament }
export { Score }
export { Song }
export { Standing }
export { Account }
export { Participant }
export { Entrant }
export { ExternalMapping }
export { AdvancementRule }
export { PhaseGroup }
export { PhaseGroupEntrant }
export { Schedule }
export { ScheduleEntry }
export { MatchTiebreak }
export { MatchTiebreakStanding }
export { RunSubmission }

export const Entities = [
    Division,
    Phase,
    Match,
    MatchResult,
    Player,
    Round,

    Tournament,
    Score,
    Song,
    Standing,
    Account
    ,Participant
    ,Entrant
    ,ExternalMapping
    ,AdvancementRule
    ,PhaseGroup
    ,PhaseGroupEntrant
    ,Schedule
    ,ScheduleEntry
    ,MatchTiebreak
    ,MatchTiebreakStanding
    ,RunSubmission
];
