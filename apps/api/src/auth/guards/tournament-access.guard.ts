import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Participant } from "@tournament-hub/persistence";

@Injectable()
export class TournamentAccessGuard implements CanActivate {
    constructor(
        @InjectRepository(Participant)
        private participantRepo: Repository<Participant>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) return false;
        if (user.isAdmin) return true;

        const tournamentId = Number(request.params.id);
        if (isNaN(tournamentId)) return false;

        const participant = await this.participantRepo
            .createQueryBuilder('participant')
            .leftJoin('participant.account', 'participantAccount')
            .leftJoin('participant.player', 'player')
            .leftJoin('player.account', 'playerAccount')
            .where('participant.tournamentId = :tournamentId', { tournamentId })
            .andWhere('(participantAccount.id = :accountId OR playerAccount.id = :accountId)', { accountId: user.id })
            .getOne();

        return participant?.roles?.some((role) => role === 'owner' || role === 'staff') ?? false;
    }
}
