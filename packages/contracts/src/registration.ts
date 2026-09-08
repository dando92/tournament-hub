import type { PlayerRefDto } from './projections';

export type ParticipantImportPreviewRowDto = {
    name: string;
    matchedPlayer: PlayerRefDto | null;
    alreadyParticipant: boolean;
};
