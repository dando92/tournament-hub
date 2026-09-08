import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Player } from '@tournament-hub/persistence';

export function normalizePlayerName(playerName: string): string {
    return playerName.trim().toLowerCase();
}

@Injectable()
export class PlayerStore {
    constructor(
        @InjectRepository(Player)
        private readonly players: Repository<Player>,
    ) {}

    async byIds(ids: number[]): Promise<Map<number, Player>> {
        if (ids.length === 0) return new Map();

        const found = await this.players.find({ where: { id: In(ids) } });

        return new Map(found.map((player) => [player.id, player]));
    }

    async byNormalizedNames(playerNames: string[]): Promise<Map<string, Player>> {
        const normalized = [...new Set(playerNames.map(normalizePlayerName).filter(Boolean))];
        if (normalized.length === 0) return new Map();

        const found = await this.players
            .createQueryBuilder('player')
            .where('LOWER(TRIM(player.playerName)) IN (:...normalized)', { normalized })
            .getMany();

        return new Map(found.map((player) => [normalizePlayerName(player.playerName), player]));
    }

    async createAll(playerNames: string[]): Promise<Player[]> {
        if (playerNames.length === 0) return [];

        return await this.players.save(playerNames.map((playerName) => this.players.create({ playerName })));
    }
}
