import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { ControlRoomKeyStore } from '@tournament/control-room/control-room-key.store';

export type ControlRoomSession = { tournamentId: number; name: string; status: 'open' | 'closed' };

export type ControlRoomRequest = Request & { controlRoom?: ControlRoomSession };

@Injectable()
export class ControlRoomKeyGuard implements CanActivate {
    constructor(private readonly keys: ControlRoomKeyStore) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<ControlRoomRequest>();
        const tournament = await this.keys.resolve(presentedKey(request));
        if (!tournament) {
            throw new UnauthorizedException('Unknown or revoked control-room key');
        }

        request.controlRoom = { tournamentId: tournament.id, name: tournament.name, status: tournament.status };
        void this.keys.touch(tournament.id).catch(() => undefined);

        return true;
    }
}

function presentedKey(request: ControlRoomRequest): string {
    const header = request.headers.authorization;
    if (header?.toLowerCase().startsWith('bearer ')) {
        return header.slice('bearer '.length).trim();
    }

    return String(request.headers['x-control-room-key'] ?? '');
}
