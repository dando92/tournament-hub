import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Division } from '@tournament-hub/persistence';
import { In, Repository } from 'typeorm';

@Injectable()
export class StructureVersionStore {
    constructor(
        @InjectRepository(Division)
        private readonly divisions: Repository<Division>,
    ) {}

    async bump(divisionId: number | null | undefined): Promise<void> {
        if (!divisionId) {
            return;
        }

        await this.divisions.increment({ id: divisionId }, 'structureVersion', 1);
    }

    async versionsOf(divisionIds: number[]): Promise<Map<number, number>> {
        if (divisionIds.length === 0) {
            return new Map();
        }

        const divisions = await this.divisions.find({
            where: { id: In(divisionIds) },
            select: { id: true, structureVersion: true },
        });

        return new Map(divisions.map((division) => [division.id, division.structureVersion]));
    }
}
