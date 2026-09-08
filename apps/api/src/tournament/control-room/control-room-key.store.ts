import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tournament } from '@tournament-hub/persistence';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';

export type ControlRoomKeyStatus = {
    hasKey: boolean;
    issuedAt: string | null;
    lastUsedAt: string | null;
};

const KEY_PREFIX = 'tmcr_';

@Injectable()
export class ControlRoomKeyStore {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournaments: Repository<Tournament>,
    ) {}

    async issue(tournamentId: number): Promise<string> {
        const key = `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
        const result = await this.tournaments.update(
            { id: tournamentId },
            { controlRoomKeyHash: hashOf(key), controlRoomKeyIssuedAt: new Date(), controlRoomKeyLastUsedAt: null },
        );
        if (result.affected === 0) {
            throw new NotFoundException(`Tournament with id ${tournamentId} not found`);
        }

        return key;
    }

    async revoke(tournamentId: number): Promise<void> {
        await this.tournaments.update(
            { id: tournamentId },
            { controlRoomKeyHash: null, controlRoomKeyIssuedAt: null, controlRoomKeyLastUsedAt: null },
        );
    }

    async status(tournamentId: number): Promise<ControlRoomKeyStatus | null> {
        const tournament = await this.tournaments.findOne({
            where: { id: tournamentId },
            select: { id: true, controlRoomKeyHash: true, controlRoomKeyIssuedAt: true, controlRoomKeyLastUsedAt: true },
        });
        if (!tournament) {
            return null;
        }

        return {
            hasKey: Boolean(tournament.controlRoomKeyHash),
            issuedAt: tournament.controlRoomKeyIssuedAt?.toISOString() ?? null,
            lastUsedAt: tournament.controlRoomKeyLastUsedAt?.toISOString() ?? null,
        };
    }

    async resolve(key: string): Promise<Tournament | null> {
        if (!key?.startsWith(KEY_PREFIX)) {
            return null;
        }
        const tournament = await this.tournaments.findOne({ where: { controlRoomKeyHash: hashOf(key) } });

        return tournament?.status === 'open' ? tournament : null;
    }

    touch(tournamentId: number): Promise<unknown> {
        return this.tournaments.update({ id: tournamentId }, { controlRoomKeyLastUsedAt: new Date() });
    }
}

function hashOf(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}
