import { ScoringSystemProvider } from '@tournament-hub/scoring';
import type { ScoringStanding, ScoringSystemType } from '@tournament-hub/scoring';

import { Profile } from './options';
import { Random } from './random';

export const TABLES: Array<{ table: string; columns: string[] }> = [
    { table: 'player', columns: ['id', 'playerName', 'nationality'] },
    {
        table: 'tournament',
        columns: ['id', 'name', 'status', 'closedAt', 'startggApiKey', 'defaultScoringSystem'],
    },
    { table: 'song', columns: ['id', 'title', 'artist', 'group', 'difficulty', 'chartDifficulty', 'tournamentId'] },
    { table: 'participant', columns: ['id', 'roles', 'status', 'tournamentId', 'playerId', 'accountId'] },
    { table: 'division', columns: ['id', 'name', 'tournamentId'] },
    { table: 'entrant', columns: ['id', 'name', 'type', 'status', 'seedNum', 'divisionId'] },
    { table: 'entrant_participants_participant', columns: ['entrantId', 'participantId'] },
    { table: 'phase', columns: ['id', 'name', 'divisionId'] },
    { table: 'phase_group', columns: ['id', 'name', 'displayIdentifier', 'bracketType', 'state', 'phaseId'] },
    { table: 'phase_group_entrant', columns: ['id', 'seedNum', 'slot', 'status', 'phaseGroupId', 'entrantId', 'sourceAdvancementRuleId'] },
    { table: 'match_result', columns: ['id', 'playerPoints'] },
    { table: 'match', columns: ['id', 'name', 'subtitle', 'notes', 'scoringSystem', 'active', 'state', 'matchResultId', 'phaseGroupId'] },
    { table: 'match_entrants_entrant', columns: ['matchId', 'entrantId'] },
    { table: 'round', columns: ['id', 'matchId', 'songId'] },
    { table: 'score', columns: ['id', 'percentage', 'isFailed', 'source', 'songId', 'playerId'] },
    { table: 'standing', columns: ['id', 'points', 'scoreId', 'roundId', 'playerId'] },
    { table: 'match_tiebreak', columns: ['id', 'sequence', 'invalidated', 'matchId', 'songId'] },
    { table: 'match_tiebreak_standing', columns: ['id', 'tiebreakId', 'playerId', 'scoreId', 'manualPoints'] },
    { table: 'advancement_rule', columns: ['id', 'sourceKind', 'sourceId', 'sourcePlacement', 'targetKind', 'targetId', 'targetSlot'] },
    {
        table: 'schedule',
        columns: [
            'id',
            'name',
            'willStartAt',
            'status',
            'currentEntryId',
            'staleCode',
            'staleDetails',
            'interruptionCode',
            'interruptionDetails',
            'interruptedAt',
            'archivedAt',
            'version',
            'tournamentId',
        ],
    },
    { table: 'schedule_entry', columns: ['id', 'position', 'expectedDurationMinutes', 'startedAt', 'completedAt', 'scheduleId', 'matchId'] },
];

export const ID_TABLES = TABLES.map(({ table }) => table).filter(
    (table) => table !== 'entrant_participants_participant' && table !== 'match_entrants_entrant',
);

export type ExistingState = {
    tournaments: number;
    players: number[];
    target: ExistingTournament | null;
};

export type ExistingTournament = {
    id: number;
    participants: Map<number, number>;
    songs: number[];
    hasRunningSchedule: boolean;
};

export type Dataset = {
    rows: Record<string, unknown[][]>;
    currentEntries: Array<{ scheduleId: number; entryId: number }>;
    counts: Record<string, number>;
};

export function poolSize(profile: Profile): number {
    const perTournament = profile.divisions * profile.entrantsPerDivision + profile.completedDivisions * COMPLETED_DIVISION_ENTRANTS;
    const closedEntrants = profile.divisionsPerClosedTournament * profile.entrantsPerClosedDivision;

    return Math.max(Math.ceil(perTournament * 0.8), Math.ceil(perTournament * profile.tournaments * 0.4), closedEntrants, 2);
}

type MatchIntent = 'completed' | 'ready' | 'tiebreak_required' | 'partial' | 'open_with_rounds' | 'open_empty';

const INTENT_MIX: ReadonlyArray<readonly [MatchIntent, number]> = [
    ['completed', 17],
    ['ready', 17],
    ['tiebreak_required', 4],
    ['partial', 16],
    ['open_with_rounds', 26],
    ['open_empty', 20],
];

const COMPLETED_DIVISION_ENTRANTS = 8;

const NATIONALITIES = ['IT', 'JP', 'US', 'GB', 'DE', 'FR', 'BR', 'SE', 'NL', 'CA', 'AU', 'ES', '', ''];

const SONG_GROUPS = ['In The Groove', 'Fraxtil', 'Tachyon', 'Gpop', 'Cirque du Sordid', 'Waixing', 'Digital Dance'];
const CHART_DIFFICULTIES = ['Novice', 'Easy', 'Medium', 'Hard', 'Expert'];
const DIVISION_NAMES = ['Open', 'Amateur', 'Novice', 'Advanced', 'Expert', 'Rookie', 'Veteran', 'Wild'];

type EntrantSeat = { entrantId: number; playerId: number; seedNum: number };

type PlannedStanding = { playerId: number; points: number; score: { percentage: number; isFailed: boolean } | null };

type PlannedRound = { songId: number | null; standings: PlannedStanding[] };

type PlannedMatch = { matchId: number; intent: MatchIntent; hasRounds: boolean; order: number[] };

export class DatasetBuilder {
    private readonly rows: Record<string, unknown[][]> = Object.fromEntries(TABLES.map(({ table }) => [table, []]));
    private readonly matchRows = new Map<number, unknown[]>();
    private readonly currentEntries: Array<{ scheduleId: number; entryId: number }> = [];
    private readonly scoringSystems = new ScoringSystemProvider();

    constructor(
        private readonly profile: Profile,
        private readonly random: Random,
        private readonly tournamentName: string,
        private readonly ids: Record<string, () => number>,
        private readonly existing: ExistingState,
    ) {}

    build(): Dataset {
        if (this.existing.target) {
            this.extendTournament(this.existing.target);
        } else {
            const players = this.buildPlayers();
            for (let index = 0; index < this.profile.tournaments; index += 1) {
                this.buildOpenTournament(index, players);
            }
            for (let index = 0; index < this.profile.closedTournaments; index += 1) {
                this.buildClosedTournament(index, players);
            }
        }

        return {
            rows: this.rows,
            currentEntries: this.currentEntries,
            counts: Object.fromEntries(TABLES.map(({ table }) => [table, this.rows[table].length])),
        };
    }

    private buildPlayers(): number[] {
        const count = poolSize(this.profile);
        const returning = this.existing.players.slice(0, Math.floor(count * 0.8));

        return [...returning, ...this.createPlayers(count - returning.length)];
    }

    private createPlayers(count: number): number[] {
        const ids: number[] = [];

        for (let index = 0; index < count; index += 1) {
            const id = this.ids.player();
            ids.push(id);
            this.rows.player.push([id, `Player ${String(id).padStart(5, '0')}`, this.random.pick(NATIONALITIES)]);
        }

        return ids;
    }

    private buildOpenTournament(index: number, players: number[]): void {
        const tournamentId = this.ids.tournament();
        const sequence = this.existing.tournaments + index + 1;
        const name = sequence > 1 ? `${this.tournamentName} ${sequence}` : this.tournamentName;
        this.rows.tournament.push([tournamentId, name, 'open', null, null, 'PlacementPointsWithFailZero']);

        const songs = this.buildSongs(tournamentId, this.profile.songs);
        const participants = this.buildParticipants(tournamentId, players);
        const seatOffset = index * Math.ceil(this.profile.divisions * this.profile.entrantsPerDivision * 0.4);

        this.buildTournamentBody(tournamentId, players, participants, songs, seatOffset, true);
    }

    private extendTournament(target: ExistingTournament): void {
        const needed = Math.max(Math.ceil(this.profile.divisions * this.profile.entrantsPerDivision * 0.8), 2);
        const entered = [...target.participants.keys()];
        const participants = new Map(target.participants);
        const created = this.createPlayers(Math.max(0, needed - entered.length));

        for (const playerId of created) {
            const id = this.ids.participant();
            participants.set(playerId, id);
            this.rows.participant.push([id, ['competitor'], 'checked_in', target.id, playerId, null]);
        }

        const players = [...entered, ...created];
        const songs = [...target.songs, ...this.buildSongs(target.id, Math.max(0, this.profile.songs - target.songs.length))];
        const seatOffset = this.random.int(0, Math.max(0, players.length - 1));

        this.buildTournamentBody(target.id, players, participants, songs, seatOffset, !target.hasRunningSchedule);
    }

    private buildTournamentBody(
        tournamentId: number,
        players: number[],
        participants: Map<number, number>,
        songs: number[],
        seatOffset: number,
        allowRunning: boolean,
    ): void {
        const planned: PlannedMatch[] = [];

        for (let divisionIndex = 0; divisionIndex < this.profile.divisions; divisionIndex += 1) {
            const division = this.buildDivision(tournamentId, divisionIndex, players, participants, this.profile.entrantsPerDivision, seatOffset);
            planned.push(...this.buildCompetition(division.divisionId, division.seats, songs));
        }

        for (let index = 0; index < this.profile.completedDivisions; index += 1) {
            planned.push(...this.buildCompletedDivision(tournamentId, index, players, participants, songs, seatOffset));
        }

        this.buildSchedules(tournamentId, planned, allowRunning);
    }

    private buildClosedTournament(index: number, players: number[]): void {
        const tournamentId = this.ids.tournament();
        this.rows.tournament.push([
            tournamentId,
            `${this.tournamentName} — Past Event ${index + 1}`,
            'closed',
            new Date(Date.UTC(2024, 0, 1 + index * 5)),
            null,
            'PlacementPointsWithFailZero',
        ]);

        const participants = this.buildParticipants(tournamentId, players);
        for (let divisionIndex = 0; divisionIndex < this.profile.divisionsPerClosedTournament; divisionIndex += 1) {
            this.buildDivision(tournamentId, divisionIndex, players, participants, this.profile.entrantsPerClosedDivision);
        }
    }

    private buildSongs(tournamentId: number, count: number): number[] {
        const ids: number[] = [];

        for (let index = 0; index < count; index += 1) {
            const id = this.ids.song();
            ids.push(id);
            this.rows.song.push([
                id,
                `Track ${String(id).padStart(5, '0')}`,
                `Artist ${this.random.int(1, 60)}`,
                this.random.pick(SONG_GROUPS),
                this.random.int(1, 20),
                this.random.pick(CHART_DIFFICULTIES),
                tournamentId,
            ]);
        }

        return ids;
    }

    private buildParticipants(tournamentId: number, players: number[]): Map<number, number> {
        const participants = new Map<number, number>();

        for (const playerId of players) {
            const id = this.ids.participant();
            participants.set(playerId, id);
            this.rows.participant.push([id, ['competitor'], 'checked_in', tournamentId, playerId, null]);
        }

        return participants;
    }

    private buildDivision(
        tournamentId: number,
        divisionIndex: number,
        players: number[],
        participants: Map<number, number>,
        entrantCount: number,
        seatOffset = 0,
        divisionName?: string,
    ): { divisionId: number; seats: EntrantSeat[] } {
        const divisionId = this.ids.division();
        const name = DIVISION_NAMES[divisionIndex % DIVISION_NAMES.length];
        this.rows.division.push([divisionId, divisionName ?? `${name} ${Math.floor(divisionIndex / DIVISION_NAMES.length) + 1}`, tournamentId]);

        const seats: EntrantSeat[] = [];
        for (let index = 0; index < entrantCount; index += 1) {
            const playerId = players[(seatOffset + divisionIndex * entrantCount + index) % players.length];
            const entrantId = this.ids.entrant();
            const seedNum = index + 1;
            seats.push({ entrantId, playerId, seedNum });
            this.rows.entrant.push([entrantId, `Entrant ${divisionIndex + 1}-${seedNum}`, 'player', 'active', seedNum, divisionId]);
            this.rows.entrant_participants_participant.push([entrantId, participants.get(playerId)]);
        }

        return { divisionId, seats };
    }

    private buildCompetition(divisionId: number, seats: EntrantSeat[], songs: number[]): PlannedMatch[] {
        const planned: PlannedMatch[] = [];
        let previousExits: number[] = [];

        for (let phaseIndex = 0; phaseIndex < this.profile.phasesPerDivision; phaseIndex += 1) {
            const phaseId = this.ids.phase();
            this.rows.phase.push([phaseId, phaseIndex === 0 ? 'Pools' : `Phase ${phaseIndex + 1}`, divisionId]);

            const hasLaterPhase = phaseIndex < this.profile.phasesPerDivision - 1;
            const pools: number[] = [];
            const exits: number[] = [];

            for (let poolIndex = 0; poolIndex < this.profile.poolsPerPhase; poolIndex += 1) {
                const phaseGroupId = this.ids.phase_group();
                const identifier = String.fromCharCode(65 + (poolIndex % 26));
                pools.push(phaseGroupId);
                this.rows.phase_group.push([
                    phaseGroupId,
                    `Pool ${identifier}`,
                    identifier,
                    'round_robin',
                    phaseIndex === 0 ? 'active' : 'pending',
                    phaseId,
                ]);

                const poolSeats = this.poolSeats(seats, poolIndex);
                this.seatPool(phaseGroupId, poolSeats);
                const poolMatches = this.buildPoolMatches(phaseGroupId, identifier, poolSeats, songs, hasLaterPhase);
                planned.push(...poolMatches);
                if (poolMatches.length > 0) {
                    exits.push(poolMatches[poolMatches.length - 1].matchId);
                }
            }

            previousExits.forEach((matchId, index) => {
                this.addRule(matchId, 1, 'phase_group', pools[index % pools.length], index + 1);
            });
            previousExits = exits;
        }

        return planned;
    }

    private buildCompletedDivision(
        tournamentId: number,
        index: number,
        players: number[],
        participants: Map<number, number>,
        songs: number[],
        seatOffset: number,
    ): PlannedMatch[] {
        const suffix = this.profile.completedDivisions > 1 ? ` ${index + 1}` : '';
        const division = this.buildDivision(
            tournamentId,
            this.profile.divisions + index,
            players,
            participants,
            COMPLETED_DIVISION_ENTRANTS,
            seatOffset + index * COMPLETED_DIVISION_ENTRANTS,
            `Finished Bracket${suffix}`,
        );

        const phaseId = this.ids.phase();
        this.rows.phase.push([phaseId, 'Bracket', division.divisionId]);
        const phaseGroupId = this.ids.phase_group();
        this.rows.phase_group.push([phaseGroupId, 'Main Bracket', 'A', 'single_elimination', 'completed', phaseId]);
        this.seatPool(phaseGroupId, division.seats);

        const planned: PlannedMatch[] = [];
        let contenders = bracketSeedOrder(division.seats.length).map((seat) => division.seats[seat]);
        let previousRound: number[] = [];

        while (contenders.length > 1) {
            const size = contenders.length;
            const round: Array<{ match: PlannedMatch; winner: EntrantSeat }> = [];

            for (let pair = 0; pair < size / 2; pair += 1) {
                const seats = [contenders[pair * 2], contenders[pair * 2 + 1]];
                const match = this.buildMatch(phaseGroupId, bracketMatchName(size, pair), 'completed', seats, songs);
                round.push({ match, winner: seats.find((seat) => seat.playerId === match.order[0]) ?? seats[0] });
            }

            previousRound.forEach((matchId, source) => {
                this.addRule(matchId, 1, 'match', round[Math.floor(source / 2)].match.matchId, (source % 2) + 1);
            });

            planned.push(...round.map((entry) => entry.match));
            contenders = round.map((entry) => entry.winner);
            previousRound = round.map((entry) => entry.match.matchId);
        }

        return planned;
    }

    private poolSeats(seats: EntrantSeat[], poolIndex: number): EntrantSeat[] {
        const dealt = seats.filter((_, index) => index % this.profile.poolsPerPhase === poolIndex);

        return dealt.length >= 2 ? dealt : seats.slice(0, 2);
    }

    private seatPool(phaseGroupId: number, seats: EntrantSeat[]): void {
        seats.forEach((seat, index) => {
            this.rows.phase_group_entrant.push([
                this.ids.phase_group_entrant(),
                seat.seedNum,
                index + 1,
                'active',
                phaseGroupId,
                seat.entrantId,
                null,
            ]);
        });
    }

    private buildPoolMatches(phaseGroupId: number, identifier: string, seats: EntrantSeat[], songs: number[], hasLaterPhase: boolean): PlannedMatch[] {
        const planned: PlannedMatch[] = [];
        const last = this.profile.matchesPerPool - 1;

        for (let index = 0; index <= last; index += 1) {
            const hasOutgoingRule = index < last || hasLaterPhase;
            const drawn = this.random.weighted(INTENT_MIX);
            const intent = drawn === 'tiebreak_required' && !hasOutgoingRule ? 'ready' : drawn;
            const size = intent === 'tiebreak_required' ? 2 : this.random.weighted([[2, 70] as const, [3, 25] as const, [4, 5] as const]);
            const matchSeats = this.random.sample(seats, Math.min(size, seats.length));

            planned.push(this.buildMatch(phaseGroupId, `Pool ${identifier} Match ${index + 1}`, intent, matchSeats, songs));
        }

        for (let index = 0; index < planned.length - 1; index += 1) {
            this.addRule(planned[index].matchId, 1, 'match', planned[index + 1].matchId, 1);
        }

        return planned;
    }

    private buildMatch(phaseGroupId: number, name: string, intent: MatchIntent, seats: EntrantSeat[], songs: number[]): PlannedMatch {
        const matchId = this.ids.match();
        const scoringSystem: ScoringSystemType =
            intent !== 'tiebreak_required' && seats.length === 2 && this.random.chance(0.08) ? 'RoundWinner' : 'PlacementPointsWithFailZero';
        const rounds = this.planRounds(intent, seats, songs, scoringSystem);
        const entries = intent === 'completed' ? this.resultEntries(rounds) : [];
        let matchResultId: number | null = null;

        if (intent === 'completed') {
            matchResultId = this.ids.match_result();
            this.rows.match_result.push([matchResultId, JSON.stringify(entries)]);
        }

        const row: unknown[] = [matchId, name, null, null, scoringSystem, false, this.stateOf(intent), matchResultId, phaseGroupId];
        this.rows.match.push(row);
        this.matchRows.set(matchId, row);
        for (const seat of seats) {
            this.rows.match_entrants_entrant.push([matchId, seat.entrantId]);
        }
        this.writeRounds(matchId, rounds);
        if (intent === 'tiebreak_required') {
            this.writeOpenTiebreak(matchId, seats, songs, rounds);
        }

        return { matchId, intent, hasRounds: rounds.length > 0, order: entries.map((entry) => entry.playerId) };
    }

    private stateOf(intent: MatchIntent): string {
        return intent === 'open_with_rounds' || intent === 'open_empty' ? 'open' : intent;
    }

    private planRounds(intent: MatchIntent, seats: EntrantSeat[], songs: number[], scoringSystem: ScoringSystemType): PlannedRound[] {
        if (intent === 'open_empty') {
            return [];
        }

        const chosen = this.random.sample(songs, this.random.int(2, 3));
        if (intent === 'open_with_rounds') {
            return chosen.map((songId) => ({ songId, standings: [] }));
        }
        if (intent === 'partial') {
            const played = seats.slice(0, seats.length - 1);

            return chosen.map((songId, index) => ({
                songId,
                standings:
                    index > 0
                        ? []
                        : played.map((seat) => ({
                              playerId: seat.playerId,
                              points: 0,
                              score: { percentage: this.random.percentage(55, 99), isFailed: false },
                          })),
            }));
        }
        if (intent === 'tiebreak_required') {
            return this.tiedRounds(chosen, seats, scoringSystem);
        }
        if (this.random.chance(0.1)) {
            return [this.handScoredRound(seats)];
        }

        return this.separatedRounds(chosen, seats, scoringSystem);
    }

    private separatedRounds(songs: number[], seats: EntrantSeat[], scoringSystem: ScoringSystemType): PlannedRound[] {
        for (let attempt = 0; attempt < 12; attempt += 1) {
            const rounds = songs.map((songId) => this.scoredRound(songId, seats, scoringSystem, false));
            if (this.totalsAreDistinct(rounds, seats)) {
                return rounds;
            }
        }

        return songs.map((songId) => this.scoredRound(songId, seats, scoringSystem, true));
    }

    private tiedRounds(songs: number[], seats: EntrantSeat[], scoringSystem: ScoringSystemType): PlannedRound[] {
        return songs.map((songId) => {
            const percentage = this.random.percentage(70, 98);
            const standings = seats.map((seat) => ({ playerId: seat.playerId, points: 0, score: { percentage, isFailed: false } }));
            this.award(standings, scoringSystem);

            return { songId, standings };
        });
    }

    private scoredRound(songId: number, seats: EntrantSeat[], scoringSystem: ScoringSystemType, ranked: boolean): PlannedRound {
        const percentages = this.distinctPercentages(seats.length);
        const order = ranked ? seats : this.random.shuffle(seats);
        const failedIndex = !ranked && this.random.chance(0.08) ? this.random.int(0, seats.length - 1) : -1;
        const standings = order.map((seat, index) => ({
            playerId: seat.playerId,
            points: 0,
            score: { percentage: percentages[index], isFailed: index === failedIndex },
        }));
        this.award(standings, scoringSystem);

        return { songId, standings };
    }

    private handScoredRound(seats: EntrantSeat[]): PlannedRound {
        return {
            songId: null,
            standings: seats.map((seat, index) => ({ playerId: seat.playerId, points: seats.length - index, score: null })),
        };
    }

    private distinctPercentages(count: number): number[] {
        const top = this.random.percentage(88, 99);

        return Array.from({ length: count }, (_, index) => Math.round((top - index * this.random.percentage(1.5, 6)) * 100) / 100);
    }

    private award(standings: PlannedStanding[], scoringSystem: ScoringSystemType): void {
        const system = this.scoringSystems.getScoringSystem(scoringSystem);
        if (!system) {
            throw new Error(`Unknown scoring system ${scoringSystem}`);
        }
        system.recalc(standings.filter((standing) => standing.score !== null) as ScoringStanding[]);
    }

    private totalsAreDistinct(rounds: PlannedRound[], seats: EntrantSeat[]): boolean {
        const totals = seats.map((seat) => this.totalOf(rounds, seat.playerId));

        return new Set(totals).size === totals.length;
    }

    private totalOf(rounds: PlannedRound[], playerId: number): number {
        return rounds.reduce((total, round) => total + (round.standings.find((standing) => standing.playerId === playerId)?.points ?? 0), 0);
    }

    private resultEntries(rounds: PlannedRound[]): Array<{ playerId: number; points: number; placement: number }> {
        const totals = new Map<number, number>();
        for (const round of rounds) {
            for (const standing of round.standings) {
                totals.set(standing.playerId, (totals.get(standing.playerId) ?? 0) + standing.points);
            }
        }

        return [...totals.entries()]
            .sort(([leftPlayer, leftPoints], [rightPlayer, rightPoints]) => rightPoints - leftPoints || leftPlayer - rightPlayer)
            .map(([playerId, points], index) => ({ playerId, points, placement: index + 1 }));
    }

    private writeRounds(matchId: number, rounds: PlannedRound[]): void {
        for (const round of rounds) {
            const roundId = this.ids.round();
            this.rows.round.push([roundId, matchId, round.songId]);

            for (const standing of round.standings) {
                let scoreId: number | null = null;
                if (standing.score) {
                    scoreId = this.ids.score();
                    this.rows.score.push([scoreId, standing.score.percentage, standing.score.isFailed, round.songId, standing.playerId]);
                }
                this.rows.standing.push([this.ids.standing(), standing.points, scoreId, roundId, standing.playerId]);
            }
        }
    }

    private writeOpenTiebreak(matchId: number, seats: EntrantSeat[], songs: number[], rounds: PlannedRound[]): void {
        const used = new Set(rounds.map((round) => round.songId));
        const songId = songs.find((candidate) => !used.has(candidate)) ?? songs[0];
        const tiebreakId = this.ids.match_tiebreak();
        this.rows.match_tiebreak.push([tiebreakId, 1, false, matchId, songId]);

        for (const seat of seats) {
            this.rows.match_tiebreak_standing.push([this.ids.match_tiebreak_standing(), tiebreakId, seat.playerId, null, null]);
        }
    }

    private addRule(sourceId: number, sourcePlacement: number, targetKind: string, targetId: number, targetSlot: number): void {
        this.rows.advancement_rule.push([this.ids.advancement_rule(), 'match', sourceId, sourcePlacement, targetKind, targetId, targetSlot]);
    }

    private buildSchedules(tournamentId: number, planned: PlannedMatch[], allowRunning: boolean): void {
        const settled = planned.filter((match) => match.intent === 'completed');
        const startable = planned.filter((match) => (match.intent === 'partial' || match.intent === 'open_with_rounds') && match.hasRounds);
        const waiting = planned.filter((match) => match.intent !== 'completed');
        const taken = new Set<number>();
        const cursors = { settled: 0, startable: 0, waiting: 0 };

        const nextOf = (source: PlannedMatch[], key: keyof typeof cursors): PlannedMatch | null => {
            while (cursors[key] < source.length && taken.has(source[cursors[key]].matchId)) {
                cursors[key] += 1;
            }

            return cursors[key] < source.length ? source[cursors[key]++] : null;
        };

        for (let index = 0; index < this.profile.schedules; index += 1) {
            const scheduleId = this.ids.schedule();
            const running = allowRunning && index === 0;
            const archived = index % 4 === 3;
            const status = running ? 'running' : index % 4 === 1 ? 'completed' : 'inactive';
            const willStartAt = new Date(Date.UTC(2026, 8, 4, 9 + (index % 12), 0));
            this.rows.schedule.push([
                scheduleId,
                `${running ? 'Main Stage' : archived ? 'Archived Board' : 'Side Stage'} ${index + 1}`,
                willStartAt,
                status,
                null,
                null,
                null,
                null,
                null,
                null,
                archived ? new Date(Date.UTC(2026, 8, 3)) : null,
                1,
                tournamentId,
            ]);

            const finishedCount = running ? Math.floor(this.profile.entriesPerSchedule / 3) : 0;
            let currentEntryId: number | null = null;

            for (let position = 1; position <= this.profile.entriesPerSchedule; position += 1) {
                const finished = running && position <= finishedCount;
                const isCurrent = running && position === finishedCount + 1;
                const match = finished ? nextOf(settled, 'settled') : isCurrent ? nextOf(startable, 'startable') : nextOf(waiting, 'waiting');
                if (!match) {
                    break;
                }
                taken.add(match.matchId);

                const entryId = this.ids.schedule_entry();
                this.rows.schedule_entry.push([
                    entryId,
                    position,
                    this.random.int(15, 45),
                    finished || isCurrent ? willStartAt : null,
                    finished ? willStartAt : null,
                    scheduleId,
                    match.matchId,
                ]);

                if (isCurrent) {
                    currentEntryId = entryId;
                    this.activate(match.matchId);
                }
            }

            if (currentEntryId) {
                this.currentEntries.push({ scheduleId, entryId: currentEntryId });
            }
        }
    }

    private activate(matchId: number): void {
        const row = this.matchRows.get(matchId);
        if (row) {
            row[5] = true;
        }
    }
}

function bracketSeedOrder(size: number): number[] {
    let order = [0];

    while (order.length < size) {
        const round = order.length * 2;
        order = order.flatMap((seed) => [seed, round - 1 - seed]);
    }

    return order;
}

function bracketMatchName(size: number, index: number): string {
    if (size === 2) {
        return 'Final';
    }
    if (size === 4) {
        return `Semi-final ${index + 1}`;
    }
    if (size === 8) {
        return `Quarter-final ${index + 1}`;
    }

    return `Round of ${size} match ${index + 1}`;
}
