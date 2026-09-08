import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { RunSubmission } from '@tournament-hub/persistence';
import { DataSource, Repository } from 'typeorm';

import { CompletedRun, MatchCommands } from '@match/match.commands';
import { MatchQueries } from '@match/match.queries';
import { RunInput, ScoreStore } from '@tournament/competition/score.store';
import type { ReportRunsRequestDto, ReportRunsResultDto, RunOutcomeDto } from '@tournament/control-room/play-plan.contract';
import { PlayPlanService } from '@tournament/control-room/play-plan.service';

type RecordedRun = RunInput & { scoreId: number };

const ROSTER_PLAYER_IDS = `
    SELECT  pa."playerId" AS "playerId"
    FROM    "participant" pa
    WHERE   pa."tournamentId" = $1 AND pa."playerId" = ANY($2::int[])
`;

const TOURNAMENT_OWNS_SONG = `
    SELECT  1
    FROM    "song" so
    WHERE   so."id" = $2 AND so."tournamentId" = $1
`;

const CLAIM_SUBMISSION = `
    INSERT INTO "run_submission" ("submissionId", "tournamentId")
    VALUES  ($2, $1)
    ON CONFLICT ("tournamentId", "submissionId") DO NOTHING
    RETURNING "id"
`;

@Injectable()
export class RunIngestService {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        @InjectRepository(RunSubmission) private readonly submissions: Repository<RunSubmission>,
        private readonly matches: MatchQueries,
        private readonly matchCommands: MatchCommands,
        private readonly scores: ScoreStore,
        private readonly plans: PlayPlanService,
    ) {}

    async submit(tournamentId: number, request: ReportRunsRequestDto): Promise<ReportRunsResultDto> {
        await this.assertSongOfTournament(tournamentId, request.songId);

        const claimed = await this.claim(tournamentId, request.submissionId);
        if (!claimed) {
            return this.answer(tournamentId, request.submissionId, true, await this.previousOutcome(tournamentId, request.submissionId));
        }

        const outcome = await this.apply(tournamentId, request);
        await this.submissions.update({ id: claimed }, { outcome });

        return this.answer(tournamentId, request.submissionId, false, outcome);
    }

    private async apply(tournamentId: number, request: ReportRunsRequestDto): Promise<RunOutcomeDto[]> {
        const roster = await this.rosterPlayerIds(tournamentId, request.runs.map((run) => run.playerId));
        const known = request.runs.filter((run) => roster.has(run.playerId));
        const inputs: RunInput[] = known.map((run) => ({
            playerId: run.playerId,
            songId: request.songId,
            percentage: run.exScore,
            isFailed: run.isFailed,
        }));

        const recorded = await this.scores.record(inputs, 'control-room');
        const written: RecordedRun[] = inputs.map((run, index) => ({ ...run, scoreId: recorded[index].id }));
        const applied = new Set<number>();

        for (const [matchId, played] of await this.targets(tournamentId, written)) {
            await this.matchCommands.applyCompletedSong(matchId, played);
            played.forEach((run) => applied.add(run.playerId));
        }

        return request.runs.map((run) => this.outcomeOf(run.playerId, roster.has(run.playerId), applied.has(run.playerId)));
    }

    private async targets(tournamentId: number, runs: RecordedRun[]): Promise<Map<number, CompletedRun[]>> {
        if (runs.length === 0) {
            return new Map();
        }

        const scoreIdByPlayer = new Map(runs.map((run) => [run.playerId, run.scoreId]));
        const rounds = await this.matches.liveTargetsForSong(tournamentId, runs[0].songId, [...scoreIdByPlayer.keys()]);
        const byMatch = new Map<number, CompletedRun[]>();

        for (const round of rounds) {
            const run = {
                targetKind: round.targetKind,
                targetId: round.targetId,
                playerId: round.playerId,
                scoreId: scoreIdByPlayer.get(round.playerId),
            };
            byMatch.set(round.matchId, [...(byMatch.get(round.matchId) ?? []), run]);
        }

        return byMatch;
    }

    private async claim(tournamentId: number, submissionId: string): Promise<number | null> {
        const rows: Array<{ id: number }> = await this.dataSource.query(CLAIM_SUBMISSION, [tournamentId, submissionId]);

        return rows[0]?.id ?? null;
    }

    private async previousOutcome(tournamentId: number, submissionId: string): Promise<RunOutcomeDto[]> {
        const submission = await this.submissions.findOne({ where: { submissionId, tournament: { id: tournamentId } } });

        return (submission?.outcome as RunOutcomeDto[] | null) ?? [];
    }

    private async answer(tournamentId: number, submissionId: string, duplicate: boolean, runs: RunOutcomeDto[]): Promise<ReportRunsResultDto> {
        const plan = await this.plans.stamp(tournamentId);

        return { submissionId, duplicate, planVersion: plan.version, planEtag: plan.etag, runs };
    }

    private outcomeOf(playerId: number, recorded: boolean, applied: boolean): RunOutcomeDto {
        if (!recorded) {
            return { playerId, recorded: false, applied: false, reason: 'unknown-player' };
        }

        return { playerId, recorded: true, applied, reason: applied ? null : 'no-waiting-round' };
    }

    private async rosterPlayerIds(tournamentId: number, playerIds: number[]): Promise<Set<number>> {
        if (playerIds.length === 0) {
            return new Set();
        }
        const rows: Array<{ playerId: number }> = await this.dataSource.query(ROSTER_PLAYER_IDS, [tournamentId, playerIds]);

        return new Set(rows.map((row) => row.playerId));
    }

    private async assertSongOfTournament(tournamentId: number, songId: number): Promise<void> {
        const rows = await this.dataSource.query(TOURNAMENT_OWNS_SONG, [tournamentId, songId]);
        if (rows.length === 0) {
            throw new BadRequestException(`Song ${songId} does not belong to tournament ${tournamentId}`);
        }
    }
}
