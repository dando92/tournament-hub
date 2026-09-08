import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntrantDto } from '@tournament-hub/contracts';
import { Participant, Player } from '@tournament-hub/persistence';

import { AccountStore } from '@account/account.store';
import { PlayerStore, normalizePlayerName } from '@tournament/catalog/player.store';
import { TournamentStore } from '@tournament/management/tournament.store';
import { ParticipantQueries } from '@tournament/registration/participants.queries';
import { UiUpdatePublisher } from '@tournament/shared/ui-update.publisher';
import { DivisionCommands } from '@tournament/structure/division/division.commands';
import { DivisionQueries } from '@tournament/structure/division/division.queries';

export type RegistrationInput = {
    playerId?: number;
    playerName?: string;
};

@Injectable()
export class ParticipantsCommands {
    constructor(
        private readonly tournaments: TournamentStore,
        private readonly participants: ParticipantQueries,
        private readonly players: PlayerStore,
        private readonly accounts: AccountStore,
        private readonly divisions: DivisionCommands,
        private readonly divisionQueries: DivisionQueries,
        private readonly publisher: UiUpdatePublisher,
    ) {}

    async register(tournamentId: number, input: RegistrationInput): Promise<number> {
        const tournament = await this.tournaments.loadOrFail(tournamentId);
        const participant = tournament.register(await this.playerFor(input));

        await this.tournaments.save(tournament);
        await this.publisher.emitTournamentUpdate(tournamentId);

        return participant.id;
    }

    async importAll(tournamentId: number, entries: Array<{ name: string; playerId?: number }>): Promise<number[]> {
        const named = entries.filter((entry) => entry.name?.trim());
        const chosen = await this.playersOrFail(named.map((entry) => entry.playerId).filter(Boolean));
        const created = await this.players.createAll(
            named.filter((entry) => !entry.playerId).map((entry) => entry.name.trim()),
        );

        const tournament = await this.tournaments.loadOrFail(tournamentId);
        const registered = named.map((entry) =>
            tournament.register(entry.playerId ? chosen.get(entry.playerId) : created.shift()),
        );

        await this.tournaments.save(tournament);
        await this.publisher.emitTournamentUpdate(tournamentId);

        return registered.map((participant) => participant.id);
    }

    async registerAll(tournamentId: number, players: Player[]): Promise<Participant[]> {
        const tournament = await this.tournaments.loadOrFail(tournamentId);
        const participants = players.map((player) => tournament.register(player));

        await this.tournaments.save(tournament);
        await this.publisher.emitTournamentUpdate(tournamentId);

        return participants;
    }

    async remove(tournamentId: number, participantId: number): Promise<void> {
        const tournament = await this.tournaments.load(tournamentId);
        if (!tournament?.hasParticipant(participantId)) return;

        for (const divisionId of await this.participants.divisionsOf(tournamentId, participantId)) {
            await this.divisions.removeParticipants(divisionId, [participantId]);
        }

        tournament.unregister(participantId);
        await this.tournaments.save(tournament);
        await this.publisher.emitTournamentUpdate(tournamentId);
    }

    async grantStaff(tournamentId: number, participantId: number): Promise<void> {
        const tournament = await this.tournaments.loadOrFail(tournamentId);
        const participant = tournament.participant(participantId);
        const account = participant.account ?? await this.accounts.byPlayerId(participant.player.id);
        tournament.grantStaff(participantId, account);

        await this.tournaments.save(tournament);
        await this.publisher.emitTournamentUpdate(tournamentId);
    }

    async revokeStaff(tournamentId: number, participantId: number): Promise<void> {
        const tournament = await this.tournaments.loadOrFail(tournamentId);
        tournament.revokeStaff(participantId);

        await this.tournaments.save(tournament);
        await this.publisher.emitTournamentUpdate(tournamentId);
    }

    async assignPlayerToDivision(playerId: number, divisionId: number): Promise<void> {
        const tournamentId = await this.tournamentOf(divisionId);
        const players = await this.playersOrFail([playerId]);
        const tournament = await this.tournaments.loadOrFail(tournamentId);
        const participant = tournament.register(players.get(playerId));

        await this.tournaments.save(tournament);
        await this.publisher.emitTournamentUpdate(tournamentId);
        await this.divisions.addParticipants(divisionId, [participant.id]);
    }

    async removePlayerFromDivision(playerId: number, divisionId: number): Promise<void> {
        await this.divisions.removePlayer(divisionId, playerId);
    }

    async addPlayersToDivision(
        playerNames: string[],
        divisionId: number,
    ): Promise<{ entrants: EntrantDto[]; warnings: string[] }> {
        const names = this.distinctNames(playerNames);
        const tournamentId = await this.tournamentOf(divisionId);

        const known = await this.players.byNormalizedNames(names);
        const warnings = names.filter((name) => known.has(normalizePlayerName(name)));
        const created = await this.players.createAll(names.filter((name) => !known.has(normalizePlayerName(name))));
        created.forEach((player) => known.set(normalizePlayerName(player.playerName), player));

        const tournament = await this.tournaments.loadOrFail(tournamentId);
        const registered = names.map((name) => tournament.register(known.get(normalizePlayerName(name))));

        await this.tournaments.save(tournament);
        await this.publisher.emitTournamentUpdate(tournamentId);

        const admitted = new Set(await this.divisions.addParticipants(divisionId, registered.map((participant) => participant.id)));
        const entrants = (await this.divisionQueries.entrants(divisionId)).filter((entrant) => admitted.has(entrant.id));

        return { entrants, warnings };
    }

    private async playerFor(input: RegistrationInput): Promise<Player> {
        if (input.playerId) return (await this.playersOrFail([input.playerId])).get(input.playerId);

        const name = input.playerName?.trim();
        if (!name) throw new BadRequestException('playerId or playerName is required');

        const known = await this.players.byNormalizedNames([name]);

        return known.get(normalizePlayerName(name)) ?? (await this.players.createAll([name]))[0];
    }

    private async playersOrFail(playerIds: number[]): Promise<Map<number, Player>> {
        const players = await this.players.byIds(playerIds);
        const missing = playerIds.find((playerId) => !players.has(playerId));
        if (missing) throw new NotFoundException(`Player ${missing} not found`);

        return players;
    }

    private distinctNames(playerNames: string[]): string[] {
        const seen = new Set<string>();

        return playerNames
            .map((name) => name.trim())
            .filter((name) => name.length > 0 && !seen.has(normalizePlayerName(name)) && seen.add(normalizePlayerName(name)));
    }

    private async tournamentOf(divisionId: number): Promise<number> {
        const tournamentId = await this.divisionQueries.tournamentIdOf(divisionId);
        if (!tournamentId) throw new NotFoundException(`Division ${divisionId} not found`);

        return tournamentId;
    }
}
