import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
    AdvancementRule,
    Entrant,
    Match,
    MatchResult,
    MatchTiebreak,
    MatchTiebreakStanding,
    PhaseGroup,
    Player,
    Round,
    Score,
    Song,
    Standing,
} from '@tournament-hub/persistence';
import type { MatchState } from '@tournament-hub/persistence';
import type { MatchResultStateDto } from '@tournament-hub/contracts';
import type { ScoringSystemProvider, ScoringSystemType } from '@tournament-hub/scoring';
import { PlacementPointEntry, resolvePlacements, TiebreakPlacementInput } from '@match/placement.resolver';

export type MatchAddress = {
    tournamentId: number;
    divisionId: number;
    phaseId: number;
    phaseGroupId: number;
    matchId: number;
};

export type MatchRemovals = {
    roundIds: number[];
    standingIds: number[];
    tiebreakIds: number[];
    matchResultId: number | null;
};

export type MatchPoolState = {
    completed: boolean;
    awaitingCommit: boolean;
    awaitingResolution: boolean;
    progressed: boolean;
};

export type MatchDetails = {
    name?: string;
    subtitle?: string;
    notes?: string;
    scoringSystem?: ScoringSystemType;
};

type PlayedStanding = Standing & { score: Score };

function isPlayed(standing: Standing): standing is PlayedStanding {
    return Boolean(standing.score);
}

function sameIds(left: number[], right: number[]): boolean {
    return left.length === right.length && [...left].sort((a, b) => a - b).every((id, index) => id === right[index]);
}

export class MatchAggregate {
    private readonly removedRoundIds = new Set<number>();
    private readonly removedStandingIds = new Set<number>();
    private readonly removedTiebreakIds = new Set<number>();
    private removedMatchResultId: number | null = null;

    private constructor(
        private readonly match: Match,
        private readonly advancementRules: AdvancementRule[] = [],
    ) {}

    static of(match: Match, advancementRules: AdvancementRule[] = []): MatchAggregate {
        return new MatchAggregate(match, advancementRules);
    }

    static create(details: MatchDetails, phaseGroup: PhaseGroup, entrants: Entrant[]): MatchAggregate {
        const match = new Match();
        match.name = details.name;
        match.subtitle = details.subtitle;
        match.notes = details.notes;
        match.scoringSystem = details.scoringSystem;
        match.active = false;
        match.state = 'open';
        match.phaseGroup = phaseGroup;
        match.entrants = entrants;
        match.rounds = [];
        match.tiebreaks = [];
        match.matchResult = null;

        return new MatchAggregate(match);
    }

    get id(): number {
        return this.match.id;
    }

    get entity(): Match {
        return this.match;
    }

    get phaseGroupId(): number {
        return this.match.phaseGroup?.id;
    }

    get isCompleted(): boolean {
        return Boolean(this.match.matchResult);
    }

    get resultState(): MatchResultStateDto {
        if (this.match.matchResult) {
            return { status: 'completed', entries: this.match.matchResult.playerPoints ?? [], ambiguousTies: [] };
        }

        return this.calculatedResultState();
    }

    private calculatedResultState(): MatchResultStateDto {
        const points = this.calculatePoints();
        if (!points) return { status: 'incomplete', entries: [], ambiguousTies: [] };

        const resolution = resolvePlacements(points, this.tiebreakPlacementInputs(), this.outgoingAdvancementRules());
        return {
            status: resolution.ambiguousTies.length > 0 ? 'tiebreak_required' : 'ready',
            ...resolution,
        };
    }

    get state(): MatchState {
        if (this.isCompleted) {
            return 'completed';
        }

        const { status } = this.calculatedResultState();
        if (status === 'ready' || status === 'tiebreak_required') {
            return status;
        }

        return this.hasEvidence() ? 'partial' : 'open';
    }

    get poolState(): MatchPoolState {
        const state = this.state;

        return {
            completed: state === 'completed',
            awaitingCommit: state === 'ready',
            awaitingResolution: state === 'ready' || state === 'tiebreak_required',
            progressed: state !== 'open',
        };
    }

    get entrants(): Entrant[] {
        return this.match.entrants ?? [];
    }

    get rounds(): Round[] {
        return this.match.rounds ?? [];
    }

    get tiebreaks(): MatchTiebreak[] {
        return this.match.tiebreaks ?? [];
    }

    get address(): MatchAddress {
        const phaseGroup = this.match.phaseGroup;
        const phase = phaseGroup?.phase;
        const division = phase?.division;

        return {
            tournamentId: division?.tournament?.id,
            divisionId: division?.id,
            phaseId: phase?.id,
            phaseGroupId: phaseGroup?.id,
            matchId: this.match.id,
        };
    }

    get removals(): MatchRemovals {
        return {
            roundIds: [...this.removedRoundIds],
            standingIds: [...this.removedStandingIds],
            tiebreakIds: [...this.removedTiebreakIds],
            matchResultId: this.removedMatchResultId,
        };
    }

    settle(): void {
        this.removedRoundIds.clear();
        this.removedStandingIds.clear();
        this.removedTiebreakIds.clear();
        this.removedMatchResultId = null;
    }

    assertEditable(): void {
        if (this.match.matchResult) {
            throw new BadRequestException('Completed matches do not allow editing');
        }
    }

    describe(details: MatchDetails): void {
        if (details.name !== undefined) this.match.name = details.name;
        if (details.subtitle !== undefined) this.match.subtitle = details.subtitle;
        if (details.notes !== undefined) this.match.notes = details.notes;
    }

    changeScoringSystem(scoringSystem: ScoringSystemType, scoringSystems: ScoringSystemProvider): void {
        if (scoringSystem === this.match.scoringSystem) {
            return;
        }

        this.match.scoringSystem = scoringSystem;
        this.resettle(scoringSystems);
    }

    moveTo(phaseGroup: PhaseGroup): void {
        this.match.phaseGroup = phaseGroup;
    }

    replaceEntrants(entrants: Entrant[], scoringSystems: ScoringSystemProvider): void {
        this.match.entrants = entrants;
        this.resettle(scoringSystems);
    }

    addEntrant(entrant: Entrant, scoringSystems: ScoringSystemProvider): boolean {
        if (this.entrants.some((candidate) => candidate.id === entrant.id)) return false;
        this.match.entrants = [...this.entrants, entrant];
        this.resettle(scoringSystems);

        return true;
    }

    removeEntrant(entrantId: number, scoringSystems: ScoringSystemProvider): boolean {
        const remaining = this.entrants.filter((candidate) => candidate.id !== entrantId);
        if (remaining.length === this.entrants.length) return false;
        this.match.entrants = remaining;
        this.resettle(scoringSystems);

        return true;
    }

    placeEntrant(entrant: Entrant, slot: number, scoringSystems: ScoringSystemProvider): void {
        const others = this.entrants.filter((candidate) => candidate.id !== entrant.id);
        const index = Math.max(slot - 1, 0);

        if (index >= others.length) others.push(entrant);
        else others.splice(index, 0, entrant);

        this.match.entrants = others;
        this.resettle(scoringSystems);
    }

    activate(active: boolean): void {
        if (active && this.match.matchResult) {
            throw new BadRequestException('Completed matches must be re-opened before activation');
        }
        this.match.active = active;
    }

    assertRoundSourceAllowed(wantsSong: boolean): void {
        const handScored = this.rounds.some((round) => !round.song);

        if (wantsSong && handScored) {
            throw new BadRequestException(`Match ${this.match.id} is scored by hand; remove hand scoring before adding songs`);
        }
        if (!wantsSong && this.rounds.length > 0) {
            throw new BadRequestException(`Match ${this.match.id} already has songs; remove them before scoring it by hand`);
        }
    }

    addRound(song: Song | null): Round {
        this.invalidateTiebreaks();
        const round = new Round();
        round.song = song;
        round.standings = [];
        this.match.rounds = [...this.rounds, round];

        return round;
    }

    removeRound(roundId: number): void {
        const round = this.roundOf(roundId);
        const scored = (round.standings ?? []).length > 0;

        if (scored && round.song) {
            throw new BadRequestException(
                `Round ${roundId} still holds scores for "${round.song.title}"; delete them before removing the song`,
            );
        }

        this.match.rounds = this.rounds.filter((candidate) => candidate.id !== roundId);
        this.removedRoundIds.add(roundId);
        this.invalidateTiebreaks();
    }

    songOf(roundId: number): Song | null {
        return this.roundOf(roundId).song ?? null;
    }

    upsertScore(roundId: number, player: Player, score: Score, scoringSystems: ScoringSystemProvider): void {
        const round = this.roundOf(roundId);
        if (!round.song) {
            throw new BadRequestException(`Round ${roundId} is hand-scored and has no song to score`);
        }
        if (score.player?.id !== player.id || score.song?.id !== round.song.id) {
            throw new BadRequestException(`Score ${score.id} does not match the selected player and song`);
        }

        this.writeStanding(round, player, score, 0);
        this.rankIfComplete(round, scoringSystems);
        this.invalidateTiebreaks();
    }

    upsertPoints(roundId: number, player: Player, points: number): void {
        const round = this.roundOf(roundId);
        if (round.song) {
            throw new BadRequestException(
                `Round ${roundId} is scored from song ${round.song.id}; its points are computed, not assigned`,
            );
        }

        this.writeStanding(round, player, null, points);
        this.invalidateTiebreaks();
    }

    removeStanding(roundId: number, playerId: number): void {
        const round = this.roundOf(roundId);
        const standing = (round.standings ?? []).find((candidate) => candidate.player?.id === playerId);
        if (!standing) return;

        round.standings = round.standings.filter((candidate) => candidate !== standing);
        if (standing.id) this.removedStandingIds.add(standing.id);

        if (round.song) round.standings.forEach((candidate) => (candidate.points = 0));
        this.invalidateTiebreaks();
    }

    addTiebreak(song: Song | null, players: Player[]): MatchTiebreak {
        this.assertEditable();
        const requested = [...players].map((player) => player.id).sort((left, right) => left - right);
        const tie = this.resultState.ambiguousTies.find((candidate) =>
            sameIds(candidate.playerIds, requested),
        );
        if (!tie) {
            throw new BadRequestException('A tiebreak must contain exactly one currently ambiguous tied group');
        }
        if (this.tiebreaks.some((candidate) => !candidate.invalidated && !this.isTiebreakComplete(candidate))) {
            throw new BadRequestException('Complete or remove the current tiebreak before adding another');
        }

        const tiebreak = new MatchTiebreak();
        tiebreak.sequence = this.tiebreaks.reduce((maximum, candidate) => Math.max(maximum, candidate.sequence), 0) + 1;
        tiebreak.invalidated = false;
        tiebreak.song = song;
        tiebreak.standings = players.map((player) => {
            const standing = new MatchTiebreakStanding();
            standing.player = player;
            standing.score = null;
            standing.manualPoints = song ? null : 0;

            return standing;
        });
        this.match.tiebreaks = [...this.tiebreaks, tiebreak];

        return tiebreak;
    }

    removeTiebreak(tiebreakId: number): void {
        const tiebreak = this.tiebreakOf(tiebreakId);
        this.match.tiebreaks = this.tiebreaks.filter((candidate) => candidate !== tiebreak);
        if (tiebreak.id) this.removedTiebreakIds.add(tiebreak.id);
    }

    tiebreakSongOf(tiebreakId: number): Song | null {
        return this.tiebreakOf(tiebreakId).song ?? null;
    }

    upsertTiebreakScore(tiebreakId: number, player: Player, score: Score): void {
        const tiebreak = this.tiebreakOf(tiebreakId);
        if (tiebreak.invalidated) throw new BadRequestException(`Tiebreak ${tiebreakId} is invalidated`);
        if (!tiebreak.song) throw new BadRequestException(`Tiebreak ${tiebreakId} is scored by hand`);
        if (score.player?.id !== player.id || score.song?.id !== tiebreak.song.id) {
            throw new BadRequestException(`Score ${score.id} does not match the selected player and tiebreak song`);
        }

        const standing = this.tiebreakStandingOf(tiebreak, player.id);
        standing.score = score;
        standing.manualPoints = null;
    }

    upsertTiebreakPoints(tiebreakId: number, playerId: number, points: number): void {
        const tiebreak = this.tiebreakOf(tiebreakId);
        if (tiebreak.invalidated) throw new BadRequestException(`Tiebreak ${tiebreakId} is invalidated`);
        if (tiebreak.song) throw new BadRequestException(`Tiebreak ${tiebreakId} is scored from a song`);

        const standing = this.tiebreakStandingOf(tiebreak, playerId);
        standing.score = null;
        standing.manualPoints = points;
    }

    clearTiebreakStanding(tiebreakId: number, playerId: number): void {
        const tiebreak = this.tiebreakOf(tiebreakId);
        const standing = this.tiebreakStandingOf(tiebreak, playerId);
        standing.score = null;
        standing.manualPoints = tiebreak.song ? null : 0;
    }

    commit(): void {
        const state = this.calculatedResultState();
        if (state.status === 'incomplete') {
            throw new BadRequestException(`Match ${this.match.id} cannot be completed because not all standings are populated`);
        }
        if (state.status === 'tiebreak_required') {
            throw new BadRequestException({
                code: 'MATCH_TIEBREAK_REQUIRED',
                message: `Match ${this.match.id} cannot be completed because an advancement placement is tied`,
                ties: state.ambiguousTies,
            });
        }

        const result = this.match.matchResult ?? new MatchResult();
        result.playerPoints = state.entries;
        this.match.matchResult = result;
        this.match.active = false;
    }

    reopen(): void {
        if (this.match.matchResult?.id) {
            this.removedMatchResultId = this.match.matchResult.id;
        }
        this.match.matchResult = null;
        this.match.active = false;
    }

    entrantsByPlacement(): Entrant[] {
        const order = new Map(
            (this.match.matchResult?.playerPoints ?? []).map((entry, index) => [entry.playerId, index]),
        );

        return [...this.entrants].sort((left, right) =>
            (order.get(left.participants?.[0]?.player?.id) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(right.participants?.[0]?.player?.id) ?? Number.MAX_SAFE_INTEGER),
        );
    }

    private hasEvidence(): boolean {
        return this.rounds.some((round) =>
            (round.standings ?? []).some((standing) => Boolean(standing.score) || standing.points > 0),
        );
    }

    private calculatePoints(): PlacementPointEntry[] | null {
        const playerIds = this.singlesPlayerIds();
        if (playerIds.length === 0 || this.rounds.length === 0) return null;

        const everyRoundSettled = this.rounds.every((round) =>
            round.song
                ? playerIds.every((playerId) =>
                    (round.standings ?? []).some((standing) => standing.player.id === playerId),
                )
                : (round.standings ?? []).some((standing) => standing.points > 0),
        );
        if (!everyRoundSettled) return null;

        const playerPoints = playerIds.map((playerId) => ({
            playerId,
            points: this.rounds.reduce((total, round) => {
                const standing = (round.standings ?? []).find((candidate) => candidate.player.id === playerId);

                return total + (standing?.points ?? 0);
            }, 0),
            averagePercentage: this.averagePercentageOf(playerId),
        }));

        return playerPoints;
    }

    private averagePercentageOf(playerId: number): number | null {
        const percentages = this.rounds
            .flatMap((round) => round.standings ?? [])
            .filter((standing) => standing.player?.id === playerId)
            .filter(isPlayed)
            .filter((standing) => !standing.score.isFailed)
            .map((standing) => Number(standing.score.percentage));

        if (percentages.length === 0) {
            return null;
        }

        return percentages.reduce((total, percentage) => total + percentage, 0) / percentages.length;
    }

    private tiebreakPlacementInputs(): TiebreakPlacementInput[] {
        return this.tiebreaks.map((tiebreak) => ({
            id: tiebreak.id ?? 0,
            sequence: tiebreak.sequence,
            invalidated: tiebreak.invalidated,
            complete: this.isTiebreakComplete(tiebreak),
            entries: (tiebreak.standings ?? []).map((standing) => ({
                playerId: standing.player.id,
                value: tiebreak.song ? Number(standing.score?.percentage ?? 0) : standing.manualPoints ?? null,
                isFailed: tiebreak.song ? standing.score?.isFailed ?? null : null,
            })),
        }));
    }

    private outgoingAdvancementRules(): AdvancementRule[] {
        return this.advancementRules.filter((rule) => rule.sourceKind === 'match' && rule.sourceId === this.match.id);
    }

    private isTiebreakComplete(tiebreak: MatchTiebreak): boolean {
        const standings = tiebreak.standings ?? [];
        if (standings.length < 2) return false;

        return tiebreak.song
            ? standings.every((standing) => Boolean(standing.score))
            : standings.some((standing) => (standing.manualPoints ?? 0) > 0);
    }

    private tiebreakOf(tiebreakId: number): MatchTiebreak {
        const tiebreak = this.tiebreaks.find((candidate) => candidate.id === tiebreakId);
        if (!tiebreak) throw new NotFoundException(`Tiebreak with id ${tiebreakId} not found in match ${this.match.id}`);

        return tiebreak;
    }

    private tiebreakStandingOf(tiebreak: MatchTiebreak, playerId: number): MatchTiebreakStanding {
        const standing = (tiebreak.standings ?? []).find((candidate) => candidate.player?.id === playerId);
        if (!standing) throw new BadRequestException(`Player ${playerId} does not participate in tiebreak ${tiebreak.id}`);

        return standing;
    }

    private invalidateTiebreaks(): void {
        this.tiebreaks.forEach((tiebreak) => {
            tiebreak.invalidated = true;
        });
    }

    private roundOf(roundId: number): Round {
        const round = this.rounds.find((candidate) => candidate.id === roundId);
        if (!round) throw new NotFoundException(`Round with id ${roundId} not found in match ${this.match.id}`);

        return round;
    }

    private writeStanding(round: Round, player: Player, score: Score | null, points: number): void {
        const existing = (round.standings ?? []).find((candidate) => candidate.player?.id === player.id);
        const standing = existing ?? new Standing();
        standing.player = player;
        standing.score = score;
        standing.points = points;

        if (!existing) round.standings = [...(round.standings ?? []), standing];
    }

    private resettle(scoringSystems: ScoringSystemProvider): void {
        this.invalidateTiebreaks();
        const playerIds = new Set(this.singlesPlayerIds());

        this.rounds.forEach((round) => {
            round.standings = (round.standings ?? []).filter((standing) => {
                if (playerIds.has(standing.player?.id)) return true;
                if (standing.id) this.removedStandingIds.add(standing.id);

                return false;
            });

            if (!round.song) return;
            if (this.isRoundComplete(round)) this.rankIfComplete(round, scoringSystems);
            else round.standings.forEach((standing) => (standing.points = 0));
        });
    }

    private isRoundComplete(round: Round): boolean {
        const playerIds = this.singlesPlayerIds();
        if (playerIds.length === 0) return false;

        return playerIds.every((playerId) => (round.standings ?? []).some((standing) => standing.player.id === playerId));
    }

    private rankIfComplete(round: Round, scoringSystems: ScoringSystemProvider): void {
        if (!this.isRoundComplete(round)) return;

        const scoringSystem = scoringSystems.getScoringSystem(this.match.scoringSystem);
        if (!scoringSystem) throw new Error(`Unknown scoring system ${this.match.scoringSystem}`);

        scoringSystem.recalc(round.standings.filter(isPlayed));
    }

    private singlesPlayerIds(): number[] {
        return this.entrants
            .filter((entrant) => entrant.type === 'player')
            .map((entrant) => entrant.participants?.[0]?.player?.id)
            .filter((playerId): playerId is number => Number.isFinite(playerId));
    }
}
