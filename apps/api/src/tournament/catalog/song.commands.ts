import { Injectable } from '@nestjs/common';

import { SongImportOutcome, SongInput, SongStore } from '@tournament/catalog/song.store';
import { UiUpdatePublisher } from '@tournament/shared/ui-update.publisher';

@Injectable()
export class SongCommands {
    constructor(
        private readonly store: SongStore,
        private readonly publisher: UiUpdatePublisher,
    ) {}

    async create(input: SongInput): Promise<number> {
        const tournament = input.tournamentId ? await this.store.loadTournament(input.tournamentId) : null;
        const song = await this.store.add(input, tournament);
        await this.publisher.emitSongsUpdate(tournament?.id);

        return song.id;
    }

    async import(tournamentId: number, songs: SongInput[]): Promise<SongImportOutcome> {
        const tournament = await this.store.loadTournament(tournamentId);

        const outcome = await this.store.import(songs, tournament);
        if (outcome.imported > 0) await this.publisher.emitSongsUpdate(tournamentId);

        return outcome;
    }

    async delete(songId: number): Promise<void> {
        await this.publisher.emitSongsUpdate(await this.store.remove(songId));
    }
}
