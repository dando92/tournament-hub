import { ConflictException, NotFoundException } from '@nestjs/common';
import { Account, Participant, ParticipantRole, Player, Tournament } from '@tournament-hub/persistence';
import type { ScoringSystemType } from '@tournament-hub/scoring';

export type TournamentDetails = {
    name?: string;
    startggApiKey?: string | null;
    defaultScoringSystem?: ScoringSystemType;
};

export class TournamentAggregate {
    private removedParticipant: Participant | null = null;

    private constructor(private readonly tournament: Tournament) {}

    static of(tournament: Tournament): TournamentAggregate {
        return new TournamentAggregate(tournament);
    }

    static create(details: TournamentDetails): TournamentAggregate {
        const tournament = new Tournament();
        tournament.name = details.name ?? '';
        tournament.participants = [];

        return new TournamentAggregate(tournament);
    }

    get id(): number {
        return this.tournament.id;
    }

    get entity(): Tournament {
        return this.tournament;
    }

    get isOpen(): boolean {
        return this.tournament.status !== 'closed';
    }

    get removal(): Participant | null {
        return this.removedParticipant;
    }

    describe(details: TournamentDetails): void {
        const tournament = this.tournament;
        if (details.name !== undefined) tournament.name = details.name;
        if (details.startggApiKey !== undefined) tournament.startggApiKey = details.startggApiKey;
        if (details.defaultScoringSystem !== undefined) tournament.defaultScoringSystem = details.defaultScoringSystem;
    }

    assertOpen(): void {
        if (!this.isOpen) {
            throw new ConflictException(`Tournament with id ${this.tournament.id} is closed and must be reopened before it can be modified`);
        }
    }

    close(): boolean {
        if (!this.isOpen) return false;

        this.tournament.status = 'closed';
        this.tournament.closedAt = new Date();

        return true;
    }

    reopen(): boolean {
        if (this.isOpen) return false;

        this.tournament.status = 'open';
        this.tournament.closedAt = null;

        return true;
    }

    register(player: Player, roles: ParticipantRole[] = ['competitor']): Participant {
        const existing = this.participantOfPlayer(player.id);
        if (existing) {
            existing.roles = mergeRoles(existing.roles, roles);

            return existing;
        }

        const participant = new Participant();
        participant.tournament = this.tournament;
        participant.player = player;
        participant.roles = mergeRoles([], roles);
        participant.status = 'registered';
        this.tournament.participants = [...(this.tournament.participants ?? []), participant];

        return participant;
    }

    linkAccount(participant: Participant, account: Account): void {
        participant.account = account;
    }

    hasParticipant(participantId: number): boolean {
        return (this.tournament.participants ?? []).some((candidate) => candidate.id === participantId);
    }

    participant(participantId: number): Participant {
        const participant = (this.tournament.participants ?? []).find((candidate) => candidate.id === participantId);
        if (!participant) throw new NotFoundException(`Participant ${participantId} not found`);

        return participant;
    }

    unregister(participantId: number): Participant {
        const participant = this.participant(participantId);
        this.tournament.participants = (this.tournament.participants ?? []).filter((candidate) => candidate !== participant);
        this.removedParticipant = participant;

        return participant;
    }

    grantStaff(participantId: number, account: Account | null): Participant {
        const participant = this.participant(participantId);
        if (!participant.account && account) participant.account = account;
        participant.roles = mergeRoles(participant.roles, ['staff']);

        return participant;
    }

    revokeStaff(participantId: number): Participant {
        const participant = this.participant(participantId);
        participant.roles = (participant.roles ?? []).filter((role) => role !== 'staff');
        if (participant.roles.length === 0) participant.roles = ['unknown'];

        return participant;
    }

    settle(): void {
        this.removedParticipant = null;
    }

    private participantOfPlayer(playerId: number): Participant | undefined {
        return (this.tournament.participants ?? []).find((participant) => participant.player?.id === playerId);
    }
}

function mergeRoles(existing: ParticipantRole[] = [], incoming: ParticipantRole[]): ParticipantRole[] {
    const roles = new Set<ParticipantRole>(existing.filter((role) => role !== 'unknown'));
    incoming.forEach((role) => roles.add(role));

    return roles.size > 0 ? Array.from(roles) : ['unknown'];
}
