import { Entrant, Participant, Player } from '@tournament-hub/persistence';
import { EntrantDto, ParticipantDto, PlayerRefDto } from '@tournament-hub/contracts';

export function toPlayerRefDto(player: Player): PlayerRefDto {
    return {
        id: player.id,
        playerName: player.playerName,
        nationality: player.nationality ?? '',
    };
}

export function toParticipantDto(participant: Participant): ParticipantDto {
    return {
        id: participant.id,
        roles: participant.roles ?? [],
        status: participant.status,
        player: toPlayerRefDto(participant.player),
    };
}

export function toEntrantDto(entrant: Entrant): EntrantDto {
    return {
        id: entrant.id,
        name: entrant.name,
        type: entrant.type,
        status: entrant.status,
        participants: (entrant.participants ?? []).map(toParticipantDto),
    };
}
