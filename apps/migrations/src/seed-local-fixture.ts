import { DataSource } from 'typeorm';

import { Tournament } from '@tournament-hub/persistence';

export async function seedLocalFixture(dataSource: DataSource): Promise<void> {
    if (process.env.LOCAL_FIXTURE_ENABLED !== 'true') {
        return;
    }

    const name = process.env.LOCAL_FIXTURE_TOURNAMENT_NAME?.trim() || 'Local E2E Tournament';
    const tournaments = dataSource.getRepository(Tournament);
    const existing = await tournaments.findOneBy({ name });
    if (existing) {
        console.log(`Local fixture tournament "${name}" already exists.`);
        return;
    }

    const tournament = tournaments.create({
        name,
        defaultScoringSystem: 'PlacementPointsWithFailZero',
    });
    const saved = await tournaments.save(tournament);
    console.log(`Created local fixture tournament "${name}" (id ${saved.id}).`);
}
