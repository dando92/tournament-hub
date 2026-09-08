import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsRelations, In, QueryFailedError, Repository } from 'typeorm';
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

import { MatchAggregate } from '@match/match.aggregate';

const MATCH_GRAPH: FindOptionsRelations<Match> = {
    entrants: { participants: { player: true } },
    phaseGroup: { phase: { division: { tournament: true } } },
    rounds: {
        song: true,
        standings: {
            player: true,
            score: { player: true, song: true },
        },
    },
    matchResult: true,
    tiebreaks: {
        song: true,
        standings: {
            player: true,
            score: { player: true, song: true },
        },
    },
};

@Injectable()
export class MatchStore {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(Match)
        private readonly matches: Repository<Match>,
        @InjectRepository(Round)
        private readonly rounds: Repository<Round>,
        @InjectRepository(Entrant)
        private readonly entrants: Repository<Entrant>,
        @InjectRepository(PhaseGroup)
        private readonly phaseGroups: Repository<PhaseGroup>,
        @InjectRepository(Player)
        private readonly players: Repository<Player>,
        @InjectRepository(Song)
        private readonly songs: Repository<Song>,
        @InjectRepository(Score)
        private readonly scores: Repository<Score>,
        @InjectRepository(Standing)
        private readonly standings: Repository<Standing>,
        @InjectRepository(MatchTiebreak)
        private readonly tiebreaks: Repository<MatchTiebreak>,
        @InjectRepository(MatchTiebreakStanding)
        private readonly tiebreakStandings: Repository<MatchTiebreakStanding>,
        @InjectRepository(AdvancementRule)
        private readonly advancementRules: Repository<AdvancementRule>,
    ) {}

    async load(id: number): Promise<MatchAggregate | null> {
        const match = await this.matches.findOne({ where: { id }, relations: MATCH_GRAPH });
        const rules = match
            ? await this.advancementRules.find({ where: { sourceKind: 'match', sourceId: id } })
            : [];

        return match ? MatchAggregate.of(match, rules) : null;
    }

    async loadOrFail(id: number): Promise<MatchAggregate> {
        const match = await this.load(id);
        if (!match) throw new NotFoundException(`Match with id ${id} not found`);

        return match;
    }

    async locateRound(roundId: number): Promise<number> {
        const round = await this.rounds.findOne({ where: { id: roundId }, relations: { match: true } });
        if (!round?.match) throw new NotFoundException(`Round with id ${roundId} not found`);

        return round.match.id;
    }

    async locateTiebreak(tiebreakId: number): Promise<number> {
        const tiebreak = await this.tiebreaks.findOne({ where: { id: tiebreakId }, relations: { match: true } });
        if (!tiebreak?.match) throw new NotFoundException(`Tiebreak with id ${tiebreakId} not found`);

        return tiebreak.match.id;
    }

    async loadPhaseGroup(id: number): Promise<PhaseGroup> {
        const phaseGroup = await this.phaseGroups.findOne({
            where: { id },
            relations: { phase: { division: { tournament: true } } },
        });
        if (!phaseGroup) throw new NotFoundException(`PhaseGroup with ID ${id} not found`);

        return phaseGroup;
    }

    async loadEntrants(ids: number[]): Promise<Entrant[]> {
        if (ids.length === 0) return [];

        const found = await this.entrants.find({
            where: { id: In(ids) },
            relations: { participants: { player: true } },
        });
        const byId = new Map(found.map((entrant) => [entrant.id, entrant]));

        return ids.map((id) => {
            const entrant = byId.get(id);
            if (!entrant) throw new NotFoundException(`Entrant with ID ${id} not found`);

            return entrant;
        });
    }

    async loadPlayer(id: number): Promise<Player> {
        return (await this.loadPlayers([id])).get(id);
    }

    async loadPlayers(ids: number[]): Promise<Map<number, Player>> {
        if (ids.length === 0) return new Map();

        const found = await this.players.find({ where: { id: In(ids) } });
        const byId = new Map(found.map((player) => [player.id, player]));
        const missing = ids.find((id) => !byId.has(id));
        if (missing) throw new NotFoundException(`Player with id ${missing} not found`);

        return byId;
    }

    async loadSongs(ids: number[]): Promise<Song[]> {
        if (ids.length === 0) return [];

        const found = await this.songs.find({ where: { id: In(ids) } });
        const byId = new Map(found.map((song) => [song.id, song]));

        return ids.map((id) => {
            const song = byId.get(id);
            if (!song) throw new NotFoundException(`Song with id ${id} not found`);

            return song;
        });
    }

    async loadScore(id: number): Promise<Score> {
        return (await this.loadScores([id])).get(id);
    }

    async loadAssignableScore(id: number, roundId: number, playerId: number): Promise<Score> {
        const score = await this.loadScore(id);
        const assignment = await this.standings.findOne({
            where: { score: { id } },
            relations: { round: true, player: true },
        });
        if (assignment && (assignment.round.id !== roundId || assignment.player.id !== playerId)) {
            throw new ConflictException({
                code: 'SCORE_ALREADY_ASSIGNED',
                message: `Score ${id} is already assigned to another standing`,
                scoreId: id,
                standingId: assignment.id,
                roundId: assignment.round.id,
            });
        }
        const tiebreakAssignment = await this.tiebreakStandings.findOne({
            where: { score: { id } },
            relations: { tiebreak: true, player: true },
        });
        if (tiebreakAssignment) {
            throw new ConflictException({
                code: 'SCORE_ALREADY_ASSIGNED',
                message: `Score ${id} is already assigned to a tiebreak`,
                scoreId: id,
                tiebreakId: tiebreakAssignment.tiebreak.id,
            });
        }

        return score;
    }

    async loadAssignableTiebreakScore(id: number, tiebreakId: number, playerId: number): Promise<Score> {
        const score = await this.loadScore(id);
        const roundAssignment = await this.standings.findOne({ where: { score: { id } } });
        if (roundAssignment) {
            throw new ConflictException({
                code: 'SCORE_ALREADY_ASSIGNED',
                message: `Score ${id} is already assigned to a match round`,
                scoreId: id,
            });
        }
        const assignment = await this.tiebreakStandings.findOne({
            where: { score: { id } },
            relations: { tiebreak: true, player: true },
        });
        if (assignment && (assignment.tiebreak.id !== tiebreakId || assignment.player.id !== playerId)) {
            throw new ConflictException({
                code: 'SCORE_ALREADY_ASSIGNED',
                message: `Score ${id} is already assigned to another tiebreak standing`,
                scoreId: id,
                tiebreakId: assignment.tiebreak.id,
            });
        }

        return score;
    }

    async loadScores(ids: number[]): Promise<Map<number, Score>> {
        if (ids.length === 0) return new Map();

        const found = await this.scores.find({ where: { id: In(ids) }, relations: { player: true, song: true } });
        const byId = new Map(found.map((score) => [score.id, score]));
        const missing = ids.find((id) => !byId.has(id));
        if (missing) throw new NotFoundException(`Score with id ${missing} not found`);

        return byId;
    }

    async save(match: MatchAggregate): Promise<void> {
        const removals = match.removals;

        try {
            await this.dataSource.transaction(async (manager) => {
                if (removals.standingIds.length > 0) await manager.delete(Standing, removals.standingIds);
                if (removals.tiebreakIds.length > 0) await manager.delete(MatchTiebreak, removals.tiebreakIds);
                if (removals.roundIds.length > 0) await manager.delete(Round, removals.roundIds);

                const unsavedScores = this.unsavedScoresOf(match);
                if (unsavedScores.length > 0) await manager.save(Score, unsavedScores);

                match.entity.state = match.state;
                await manager.save(Match, match.entity);

                if (removals.matchResultId) await manager.delete(MatchResult, removals.matchResultId);
            });
        } catch (error) {
            const constraint = error instanceof QueryFailedError
                ? (error.driverError as { constraint?: string }).constraint
                : undefined;
            if (constraint === 'REL_90f3771a995658f98fc55e07a8') {
                throw new ConflictException({
                    code: 'SCORE_ALREADY_ASSIGNED',
                    message: 'The selected score is already assigned to another standing',
                });
            }
            throw error;
        }

        match.settle();
    }

    async remove(match: MatchAggregate): Promise<void> {
        await this.matches.remove(match.entity);
    }

    async refreshState(matchId: number): Promise<void> {
        const match = await this.load(matchId);
        if (!match) return;

        await this.matches.update(matchId, { state: match.state });
    }

    private unsavedScoresOf(match: MatchAggregate): Score[] {
        const roundScores = match.rounds
            .flatMap((round) => round.standings ?? [])
            .map((standing) => standing.score)
            .filter((score): score is Score => Boolean(score) && !score.id);
        const tiebreakScores = match.tiebreaks
            .flatMap((tiebreak) => tiebreak.standings ?? [])
            .map((standing) => standing.score)
            .filter((score): score is Score => Boolean(score) && !score.id);

        return [...roundScores, ...tiebreakScores];
    }
}
