import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module';
import { AccountModule } from '@account/account.module';
import { AdminGuard } from '@auth/guards/admin.guard';
import { CreatorOrAdminGuard } from '@auth/guards/owner-or-admin.guard';
import { TournamentAccessGuard } from '@auth/guards/tournament-access.guard';
import { PersistenceModule } from '@tournament-hub/persistence';
import { ScoringSystemProvider } from '@tournament-hub/scoring';
import { LiveMessagingModule } from '../live-messaging/live-messaging.module';
import { StartggModule } from '../integrations/startgg/startgg.module';
import { StartggMatchReporter } from '../integrations/startgg/startgg-match.reporter';
import { StartggService } from '../integrations/startgg/startgg.service';
import { TournamentStartggController } from '../integrations/startgg/tournament-startgg.controller';
import { AdvancementRulesController } from './structure/advancement/advancement-rule.controller';
import { DivisionsController } from './structure/division/division.controller';
import { DivisionQueries } from './structure/division/division.queries';
import { TreeQueries } from './structure/tree.queries';
import { StandingsQueries } from './competition/standings.queries';
import { PhaseGroupsController } from './structure/phase-group/phase-group.controller';
import { PhasesController } from './structure/division/phase.controller';
import { AdvancementRuleCommands } from './structure/advancement/advancement-rule.commands';
import { AdvancementRuleStore } from './structure/advancement/advancement-rule.store';
import { DivisionCommands } from './structure/division/division.commands';
import { StructurePlanCommands } from './structure/plan/structure-plan.commands';
import { StructurePlanController } from './structure/plan/structure-plan.controller';
import { StructurePlanStore } from './structure/plan/structure-plan.store';
import { StructureVersionStore } from './structure/structure-version.store';
import { DivisionStore } from './structure/division/division.store';
import { PhaseGroupCommands } from './structure/phase-group/phase-group.commands';
import { PhaseGroupQueries } from './structure/phase-group/phase-group.queries';
import { PhaseGroupStore } from './structure/phase-group/phase-group.store';
import { BracketController } from './competition/bracket/bracket.controller';
import { BracketCommands } from './competition/bracket/bracket.commands';
import { MatchesController } from './competition/match/match.controller';
import { AdvancementRunner } from './structure/advancement/advancement.runner';
import { MatchCommands } from './competition/match/match.commands';
import { MatchQueries } from './competition/match/match.queries';
import { MatchStore } from './competition/match/match.store';
import { UiUpdatePublisher } from './shared/ui-update.publisher';
import { PlanVersionStore } from './shared/plan-version.store';
import { ControlRoomKeyStore } from './control-room/control-room-key.store';
import { ControlRoomKeyGuard } from './control-room/control-room-key.guard';
import { ControlRoomController } from './control-room/control-room.controller';
import { PlayPlanQueries } from './control-room/play-plan.queries';
import { PlayPlanService } from './control-room/play-plan.service';
import { RunIngestService } from './control-room/run-ingest.service';
import { ScoresController } from './competition/score.controller';
import { ScoreQueries } from './competition/score.queries';
import { ScoreStore } from './competition/score.store';
import { SongsController } from './catalog/song.controller';
import { SongCommands } from './catalog/song.commands';
import { SongQueries } from './catalog/song.queries';
import { SongStore } from './catalog/song.store';
import { SongRoller } from './catalog/song-roller';
import { RoundsController } from './competition/match/rounds.controller';
import { PlayersController } from './catalog/player.controller';
import { PlayerQueries } from './catalog/player.queries';
import { PlayerStore } from './catalog/player.store';
import { ParticipantsCommands } from './registration/participants.commands';
import { TournamentCommands } from './management/tournament.commands';
import { TournamentQueries } from './management/tournament.queries';
import { TournamentStore } from './management/tournament.store';
import { TournamentOpenGuard } from './shared/tournament-open.guard';
import { TournamentsController } from './management/tournament.controller';
import { ParticipantQueries } from './registration/participants.queries';
import { TournamentParticipantsController } from './registration/participants.controller';
import { ScheduleController } from './competition/schedule/schedule.controller';
import { ScheduleCommands } from './competition/schedule/schedule.commands';
import { ScheduleQueries } from './competition/schedule/schedule.queries';
import { ScheduleStore } from './competition/schedule/schedule.store';
import { ScheduleRunner } from './competition/schedule/schedule.runner';
import { ScheduleBootstrap } from './competition/schedule/schedule.bootstrap';
import { ScheduleMutationGuard } from './competition/schedule/schedule-mutation.guard';
import { AdvancementRollbackGuard } from './structure/advancement/advancement-rollback.guard';
import { TiebreakController } from './competition/match/tiebreak.controller';
import { StatsQueries } from './stats/stats.queries';
import { TournamentStatsController } from './stats/stats.controller';

@Module({
    imports: [
        AuthModule,
        PersistenceModule,
        AccountModule,
        StartggModule,
        LiveMessagingModule,
    ],
    providers: [
        MatchCommands,
        MatchQueries,
        MatchStore,
        AdvancementRunner,
        SongRoller,
        ScoringSystemProvider,
        BracketCommands,
        PlayerQueries,
        PlayerStore,
        DivisionCommands,
        StructurePlanCommands,
        StructurePlanStore,
        StructureVersionStore,
        DivisionStore,
        ParticipantsCommands,
        PhaseGroupCommands,
        PhaseGroupQueries,
        PhaseGroupStore,
        SongCommands,
        SongStore,
        StartggService,
        StartggMatchReporter,
        AdvancementRuleStore,
        AdvancementRuleCommands,
        UiUpdatePublisher,
        PlanVersionStore,
        ControlRoomKeyStore,
        ControlRoomKeyGuard,
        PlayPlanQueries,
        PlayPlanService,
        RunIngestService,
        DivisionQueries,
        ScoreQueries,
        ScoreStore,
        SongQueries,
        ParticipantQueries,
        StandingsQueries,
        StatsQueries,
        TreeQueries,
        TournamentQueries,
        TournamentCommands,
        TournamentStore,
        ScheduleCommands,
        ScheduleQueries,
        ScheduleStore,
        ScheduleRunner,
        ScheduleBootstrap,
        ScheduleMutationGuard,
        AdvancementRollbackGuard,
        TournamentAccessGuard,
        TournamentOpenGuard,
        AdminGuard,
        CreatorOrAdminGuard,
    ],
    controllers: [
        ControlRoomController,
        TournamentsController,
        TournamentParticipantsController,
        TournamentStartggController,
        DivisionsController,
        PhasesController,
        PhaseGroupsController,
        AdvancementRulesController,
        MatchesController,
        PlayersController,
        SongsController,
        ScoresController,
        RoundsController,
        TiebreakController,
        BracketController,
        StructurePlanController,
        ScheduleController,
        TournamentStatsController,
    ],
})
export class TournamentModule {}
