import { Injectable, Logger } from '@nestjs/common';
import { Player, Score, Song } from '@tournament-hub/persistence';
import { ScoringSystemProvider } from '@tournament-hub/scoring';

import { StartggMatchReporter } from '@api/integrations/startgg/startgg-match.reporter';
import { MatchAggregate, MatchDetails, MatchPoolState } from '@match/match.aggregate';
import { MatchStore } from '@match/match.store';
import { AdvancementRunner } from '@tournament/structure/advancement/advancement.runner';
import { UiUpdatePublisher } from '@tournament/shared/ui-update.publisher';
import { StartggReportStatus } from '@tournament-hub/contracts';
import { RoundSourceDto } from '@match/match.requests';
import { parseLevels, SongRoller } from '@tournament/catalog/song-roller';
import { AdvancementRuleStore } from '@tournament/structure/advancement/advancement-rule.store';
import { ScheduleMutationGuard } from '@tournament/competition/schedule/schedule-mutation.guard';
import { ScheduleRunner } from '@tournament/competition/schedule/schedule.runner';
import { ScheduleStore } from '@tournament/competition/schedule/schedule.store';
import { AdvancementRollbackGuard } from '@tournament/structure/advancement/advancement-rollback.guard';
import { StructureVersionStore } from '@tournament/structure/structure-version.store';

export type CreateMatchInput = MatchDetails & {
    phaseGroupId: number;
    entrantIds?: number[];
    songIds?: number[];
    group?: string;
    levels?: string;
};

export type UpdateMatchInput = MatchDetails & {
    entrantIds?: number[];
    phaseGroupId?: number;
};

export type ScoreInput = {
    percentage: number;
    isFailed: boolean;
    scoreId?: number;
};

export type CompletedRun = {
    targetKind: 'round' | 'tiebreak';
    targetId: number;
    playerId: number;
    scoreId: number;
};

@Injectable()
export class MatchCommands {
    private readonly logger = new Logger(MatchCommands.name);

    constructor(
        private readonly store: MatchStore,
        private readonly publisher: UiUpdatePublisher,
        private readonly scoringSystems: ScoringSystemProvider,
        private readonly advancement: AdvancementRunner,
        private readonly advancementRules: AdvancementRuleStore,
        private readonly songRoller: SongRoller,
        private readonly startgg: StartggMatchReporter,
        private readonly controlRoom: ScheduleRunner,
        private readonly scheduleGuard: ScheduleMutationGuard,
        private readonly scheduleStore: ScheduleStore,
        private readonly advancementRollbackGuard: AdvancementRollbackGuard,
        private readonly versions: StructureVersionStore,
    ) {}

    async create(input: CreateMatchInput): Promise<number> {
        const phaseGroup = await this.store.loadPhaseGroup(input.phaseGroupId);
        const entrants = await this.store.loadEntrants(input.entrantIds ?? []);
        const match = MatchAggregate.create(input, phaseGroup, entrants);

        const songs = await this.rolledSongs(match, input);
        songs.forEach((song) => match.addRound(song));

        await this.store.save(match);
        await this.versions.bump(match.address.divisionId);
        await this.publisher.emitPhaseGroupUpdate(match.address);

        return match.id;
    }

    async update(matchId: number, input: UpdateMatchInput, confirmScheduleStop = false): Promise<void> {
        let match = await this.store.loadOrFail(matchId);
        let before = match.poolState;
        const membershipChanged = input.entrantIds !== undefined || input.phaseGroupId !== undefined;
        const removesEntrants = input.entrantIds !== undefined && match.entrants.some((entrant) => !input.entrantIds.includes(entrant.id));
        if (removesEntrants || input.phaseGroupId !== undefined) {
            await this.scheduleGuard.protectRollback(matchId, confirmScheduleStop);
            match = await this.store.loadOrFail(matchId);
            before = match.poolState;
        }
        if (membershipChanged || input.scoringSystem !== undefined) match.assertEditable();

        const origin = match.address;
        match.describe(input);
        if (input.scoringSystem !== undefined) {
            match.changeScoringSystem(input.scoringSystem, this.scoringSystems);
        }

        if (input.phaseGroupId !== undefined) {
            match.moveTo(await this.store.loadPhaseGroup(input.phaseGroupId));
        }
        if (input.entrantIds !== undefined) {
            match.replaceEntrants(await this.store.loadEntrants(input.entrantIds), this.scoringSystems);
        }

        await this.store.save(match);
        await this.controlRoom.recalculateForMatch(match.id);
        await this.announce(match, before);
        if (membershipChanged) {
            await this.versions.bump(match.address.divisionId);
            await this.publisher.emitPhaseGroupUpdate(match.address);
            if (origin.phaseGroupId !== match.address.phaseGroupId) await this.publisher.emitPhaseGroupUpdate(origin);
        }
    }

    async delete(matchId: number, confirmScheduleStop = false): Promise<void> {
        const match = await this.store.load(matchId);
        if (!match) return;

        await this.scheduleGuard.protectRollback(matchId, confirmScheduleStop);
        const scheduleId = await this.scheduleStore.scheduleIdForMatch(matchId);

        const address = match.address;
        await this.advancementRules.deleteInvolvingMatch(matchId);
        await this.store.remove(match);
        if (scheduleId) await this.controlRoom.recalculate(scheduleId);
        await this.versions.bump(address.divisionId);
        await this.publisher.emitPhaseGroupUpdate(address);
    }

    async setActive(matchId: number, active: boolean): Promise<void> {
        const match = await this.store.loadOrFail(matchId);
        await this.scheduleGuard.assertManualActivationAllowed(match.address.tournamentId);
        match.activate(active);

        await this.store.save(match);
        await this.publisher.emitMatchUpdate(match.address);
    }

    async addEntrant(matchId: number, entrantId: number): Promise<void> {
        const match = await this.store.load(matchId);
        if (!match) return;
        match.assertEditable();

        const [entrant] = await this.store.loadEntrants([entrantId]);
        if (!match.addEntrant(entrant, this.scoringSystems)) return;

        await this.saveAndAnnounceMembership(match);
    }

    async removeEntrant(matchId: number, entrantId: number): Promise<void> {
        const match = await this.store.load(matchId);
        if (!match) return;
        match.assertEditable();
        if (!match.removeEntrant(entrantId, this.scoringSystems)) return;

        await this.saveAndAnnounceMembership(match);
    }

    async addRound(matchId: number, source: RoundSourceDto, confirmScheduleStop = false): Promise<void> {
        let match = await this.store.loadOrFail(matchId);
        let before = match.poolState;
        if (before.awaitingCommit) {
            await this.scheduleGuard.protectRollback(matchId, confirmScheduleStop);
            match = await this.store.loadOrFail(matchId);
            before = match.poolState;
        }
        match.assertEditable();
        await this.addRounds(match, source);

        await this.store.save(match);
        await this.controlRoom.recalculateForMatch(match.id);
        await this.announce(match, before);
    }

    async removeRound(roundId: number, confirmScheduleStop = false): Promise<void> {
        const matchId = await this.store.locateRound(roundId);
        await this.scheduleGuard.protectRollback(matchId, confirmScheduleStop);
        const match = await this.store.loadOrFail(matchId);
        const before = match.poolState;
        match.assertEditable();
        match.removeRound(roundId);

        await this.store.save(match);
        await this.controlRoom.recalculateForMatch(match.id);
        await this.announce(match, before);
    }

    async replaceRoundSong(roundId: number, source: RoundSourceDto, confirmScheduleStop = false): Promise<void> {
        const matchId = await this.store.locateRound(roundId);
        await this.scheduleGuard.protectRollback(matchId, confirmScheduleStop);
        const match = await this.store.loadOrFail(matchId);
        const before = match.poolState;
        match.assertEditable();
        match.removeRound(roundId);
        await this.addRounds(match, source);

        await this.store.save(match);
        await this.controlRoom.recalculateForMatch(match.id);
        await this.announce(match, before);
    }

    async upsertScore(roundId: number, playerId: number, input: ScoreInput): Promise<void> {
        const match = await this.store.loadOrFail(await this.store.locateRound(roundId));
        const before = match.poolState;
        match.assertEditable();

        const player = await this.store.loadPlayer(playerId);
        const score = input.scoreId
            ? await this.store.loadAssignableScore(input.scoreId, roundId, playerId)
            : this.draftScore(player, match.songOf(roundId), input);

        match.upsertScore(roundId, player, score, this.scoringSystems);

        await this.store.save(match);
        await this.recalculateScheduleIfMoved(match, before);
        await this.announce(match, before);
    }

    async upsertPoints(roundId: number, playerId: number, points: number, confirmScheduleStop = false): Promise<void> {
        const matchId = await this.store.locateRound(roundId);
        let match = await this.store.loadOrFail(matchId);
        let before = match.poolState;
        if (points === 0 && before.awaitingCommit) {
            await this.scheduleGuard.protectRollback(match.id, confirmScheduleStop);
            match = await this.store.loadOrFail(matchId);
            before = match.poolState;
        }
        match.assertEditable();
        match.upsertPoints(roundId, await this.store.loadPlayer(playerId), points);

        await this.store.save(match);
        await this.recalculateScheduleIfMoved(match, before);
        await this.announce(match, before);
    }

    async removeStanding(roundId: number, playerId: number, confirmScheduleStop = false): Promise<void> {
        const matchId = await this.store.locateRound(roundId);
        let match = await this.store.loadOrFail(matchId);
        let before = match.poolState;
        if (before.awaitingCommit) {
            await this.scheduleGuard.protectRollback(match.id, confirmScheduleStop);
            match = await this.store.loadOrFail(matchId);
            before = match.poolState;
        }
        match.assertEditable();
        match.removeStanding(roundId, playerId);

        await this.store.save(match);
        await this.recalculateScheduleIfMoved(match, before);
        await this.announce(match, before);
    }

    async addTiebreak(matchId: number, playerIds: number[], songId?: number): Promise<number> {
        const match = await this.store.loadOrFail(matchId);
        const before = match.poolState;
        match.assertEditable();
        const players = await this.store.loadPlayers(playerIds);
        const song = songId ? (await this.store.loadSongs([songId]))[0] : null;
        const tiebreak = match.addTiebreak(song, playerIds.map((playerId) => players.get(playerId)));

        await this.store.save(match);
        await this.recalculateScheduleIfMoved(match, before);
        await this.announce(match, before);

        return tiebreak.id;
    }

    async removeTiebreak(matchId: number, tiebreakId: number): Promise<void> {
        const match = await this.store.loadOrFail(matchId);
        const before = match.poolState;
        match.assertEditable();
        match.removeTiebreak(tiebreakId);

        await this.store.save(match);
        await this.recalculateScheduleIfMoved(match, before);
        await this.announce(match, before);
    }

    async upsertTiebreakScore(matchId: number, tiebreakId: number, playerId: number, input: ScoreInput): Promise<void> {
        const match = await this.store.loadOrFail(matchId);
        const before = match.poolState;
        match.assertEditable();
        const player = await this.store.loadPlayer(playerId);
        const score = input.scoreId
            ? await this.store.loadAssignableTiebreakScore(input.scoreId, tiebreakId, playerId)
            : this.draftScore(player, match.tiebreakSongOf(tiebreakId), input);
        match.upsertTiebreakScore(tiebreakId, player, score);

        await this.store.save(match);
        await this.recalculateScheduleIfMoved(match, before);
        await this.announce(match, before);
    }

    async upsertTiebreakPoints(matchId: number, tiebreakId: number, playerId: number, points: number): Promise<void> {
        const match = await this.store.loadOrFail(matchId);
        const before = match.poolState;
        match.assertEditable();
        match.upsertTiebreakPoints(tiebreakId, playerId, points);

        await this.store.save(match);
        await this.recalculateScheduleIfMoved(match, before);
        await this.announce(match, before);
    }

    async clearTiebreakStanding(matchId: number, tiebreakId: number, playerId: number): Promise<void> {
        const match = await this.store.loadOrFail(matchId);
        const before = match.poolState;
        match.assertEditable();
        match.clearTiebreakStanding(tiebreakId, playerId);

        await this.store.save(match);
        await this.recalculateScheduleIfMoved(match, before);
        await this.announce(match, before);
    }

    async commitResult(matchId: number): Promise<StartggReportStatus> {
        const match = await this.store.loadOrFail(matchId);
        const before = match.poolState;
        if (match.isCompleted) await this.advancement.revertFromMatch(match);

        match.commit();
        await this.store.save(match);

        await this.advancement.advanceFromMatch(match);
        await this.recalculateScheduleIfMoved(match, before);
        const startggReport = await this.report(match);
        await this.announce(match, before);

        return startggReport;
    }

    async reopenResult(matchId: number, confirmScheduleStop = false): Promise<void> {
        let match = await this.store.loadOrFail(matchId);
        if (match.isCompleted) {
            await this.advancementRollbackGuard.assertMatchCanReopen(match);
        }
        await this.scheduleGuard.prepareResultReopen(matchId, confirmScheduleStop);
        match = await this.store.loadOrFail(matchId);
        const before = match.poolState;
        if (match.isCompleted) await this.advancement.revertFromMatch(match);

        match.reopen();
        await this.store.save(match);
        await this.recalculateScheduleIfMoved(match, before);
        await this.announce(match, before);
    }

    async applyCompletedSong(matchId: number, runs: CompletedRun[]): Promise<void> {
        const match = await this.store.loadOrFail(matchId);
        const before = match.poolState;
        const players = await this.store.loadPlayers(runs.map((run) => run.playerId));
        const scores = await this.store.loadScores(runs.map((run) => run.scoreId));

        for (const run of runs) {
            if (run.targetKind === 'round') {
                match.upsertScore(run.targetId, players.get(run.playerId), scores.get(run.scoreId), this.scoringSystems);
            } else {
                match.upsertTiebreakScore(run.targetId, players.get(run.playerId), scores.get(run.scoreId));
            }
        }

        await this.store.save(match);
        await this.recalculateScheduleIfMoved(match, before);
        await this.announce(match, before);
    }

    private async saveAndAnnounceMembership(match: MatchAggregate): Promise<void> {
        await this.store.save(match);
        await this.controlRoom.recalculateForMatch(match.id);
        await this.publisher.emitMatchUpdate(match.address);
        await this.publisher.emitPhaseGroupUpdate(match.address);
    }

    private async recalculateScheduleIfMoved(match: MatchAggregate, before: MatchPoolState): Promise<void> {
        const after = match.poolState;
        if (after.completed === before.completed && after.awaitingCommit === before.awaitingCommit) {
            return;
        }

        await this.controlRoom.recalculateForMatch(match.id);
    }

    private async announce(match: MatchAggregate, before: MatchPoolState): Promise<void> {
        await this.publisher.emitMatchUpdate(match.address);

        const after = match.poolState;
        const poolChanged =
            after.completed !== before.completed ||
            after.awaitingCommit !== before.awaitingCommit ||
            after.awaitingResolution !== before.awaitingResolution ||
            after.progressed !== before.progressed;
        if (poolChanged) await this.publisher.emitPhaseGroupUpdate(match.address);
    }

    private async addRounds(match: MatchAggregate, source: RoundSourceDto): Promise<void> {
        const wantsSong = Boolean(source.songId || source.level);
        match.assertRoundSourceAllowed(wantsSong);

        if (!wantsSong) {
            match.addRound(null);

            return;
        }

        const songs = await this.rolledSongs(match, source);
        songs.forEach((song) => match.addRound(song));
    }

    private async rolledSongs(match: MatchAggregate, source: {
        songId?: number;
        songIds?: number[];
        group?: string;
        level?: string;
        levels?: string;
    }): Promise<Song[]> {
        const chosen = source.songIds ?? (source.songId ? [source.songId] : []);
        if (chosen.length > 0) return await this.store.loadSongs(chosen);

        const levels = source.levels ?? source.level;
        if (!levels) return [];

        const { tournamentId, divisionId } = match.address;
        const rolled = await this.songRoller.roll({
            tournamentId,
            divisionId,
            group: source.group ?? null,
            levels: parseLevels(levels),
            matchId: match.id,
        });

        return await this.store.loadSongs(rolled.flatMap((slot) => (slot.song ? [slot.song.id] : [])));
    }

    private draftScore(player: Player, song: Song, input: ScoreInput): Score {
        const score = new Score();
        score.player = player;
        score.song = song;
        score.percentage = input.percentage;
        score.isFailed = input.isFailed;

        return score;
    }

    private async report(match: MatchAggregate): Promise<StartggReportStatus> {
        try {
            const reported = await this.startgg.reportCompletedMatch(match.entity);

            return reported ? 'reported' : 'skipped';
        } catch (error) {
            this.logger.error(`Reporting match ${match.id} to start.gg failed: ${error instanceof Error ? error.message : String(error)}`);

            return 'failed';
        }
    }
}
