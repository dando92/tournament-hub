import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ExternalMapping, Match, Round } from '@tournament-hub/persistence';
import {
    StartggBracketSetGameDataInput,
    StartggClient,
    StartggReportedSetNode,
} from '@tournament-hub/startgg';

@Injectable()
export class StartggMatchReporter {
    private readonly logger = new Logger(StartggMatchReporter.name);

    constructor(
        private readonly startggClient: StartggClient,
        @InjectRepository(ExternalMapping)
        private readonly externalMappingRepository: Repository<ExternalMapping>,
    ) {}

    async reportCompletedMatch(match: Match): Promise<StartggReportedSetNode[] | null> {
        if (!match.matchResult) {
            throw new BadRequestException(`Match ${match.id} has no completed result to report to start.gg`);
        }

        const setMapping = await this.externalMappingRepository.findOne({
            where: {
                provider: 'startgg',
                localType: 'match',
                localId: String(match.id),
                externalType: 'set',
            },
        });
        if (!setMapping) {
            this.logger.debug(`Match ${match.id} is not mapped to a start.gg set, skipping report`);
            return null;
        }

        const startggApiKey = match.phaseGroup?.phase?.division?.tournament?.startggApiKey?.trim();
        if (!startggApiKey) {
            this.logger.debug(`Match ${match.id} has no tournament start.gg API key configured, skipping report`);
            return null;
        }

        const winnerPlayerId = this.resolveWinnerPlayerId(match);
        const winnerEntrant = (match.entrants ?? []).find((entrant) =>
            (entrant.participants ?? []).some((participant) => participant.player?.id === winnerPlayerId),
        );
        if (!winnerEntrant) {
            throw new BadRequestException(`Unable to resolve winning entrant for match ${match.id}`);
        }

        const entrantMappings = await this.resolveStartggEntrantMappings(match);
        const winnerExternalEntrantId = entrantMappings.get(winnerEntrant.id);
        if (!winnerExternalEntrantId) {
            throw new BadRequestException(`Winning entrant ${winnerEntrant.id} is not mapped to a start.gg entrant`);
        }

        const result = await this.startggClient.reportBracketSet(
            setMapping.externalId,
            winnerExternalEntrantId,
            startggApiKey,
            this.buildStartggGameData(match, entrantMappings),
        );
        this.logger.log(
            `Reported match ${match.id} to start.gg set ${setMapping.externalId} with winner entrant ${winnerExternalEntrantId}`,
        );
        return result;
    }

    private resolveWinnerPlayerId(match: Match): number {
        const winner = [...(match.matchResult?.playerPoints ?? [])]
            .sort((left, right) => left.placement - right.placement || left.playerId - right.playerId)[0];
        if (!winner?.playerId) {
            throw new BadRequestException(`Match ${match.id} result does not contain a winner`);
        }

        return winner.playerId;
    }

    private async resolveStartggEntrantMappings(match: Match): Promise<Map<number, string>> {
        const entrantIds = (match.entrants ?? []).map((entrant) => entrant.id);
        if (entrantIds.length === 0) return new Map();

        const mappings = await this.externalMappingRepository.find({
            where: {
                provider: 'startgg',
                localType: 'entrant',
                localId: In(entrantIds.map((entrantId) => String(entrantId))),
                externalType: 'entrant',
            },
        });

        return new Map(mappings.map((mapping) => [Number(mapping.localId), mapping.externalId]));
    }

    private buildStartggGameData(
        match: Match,
        entrantMappings: Map<number, string>,
    ): StartggBracketSetGameDataInput[] | undefined {
        const entrants = match.entrants ?? [];
        if (entrants.length !== 2 || (match.rounds?.length ?? 0) === 0) {
            return undefined;
        }

        const entrantInfos = entrants.map((entrant) => ({
            entrant,
            playerId: entrant.participants?.[0]?.player?.id,
            externalEntrantId: entrantMappings.get(entrant.id),
        }));
        if (entrantInfos.some((info) => !info.playerId || !info.externalEntrantId)) {
            throw new BadRequestException(`Match ${match.id} cannot report game data because entrant mappings are incomplete`);
        }

        return [...(match.rounds ?? [])]
            .sort((left, right) => left.id - right.id)
            .map((round, index) => {
                const entrant1Score = this.getRoundPointsForPlayer(round, entrantInfos[0].playerId!);
                const entrant2Score = this.getRoundPointsForPlayer(round, entrantInfos[1].playerId!);
                const winnerId = entrant1Score >= entrant2Score
                    ? entrantInfos[0].externalEntrantId!
                    : entrantInfos[1].externalEntrantId!;

                return {
                    winnerId,
                    gameNum: index + 1,
                    entrant1Score,
                    entrant2Score,
                };
            });
    }

    private getRoundPointsForPlayer(round: Round, playerId: number): number {
        const standing = (round.standings ?? []).find((candidate) => candidate.score?.player?.id === playerId);
        return Number(standing?.points ?? 0);
    }
}
