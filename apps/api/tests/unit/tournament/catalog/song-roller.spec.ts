import { SongQueries } from '@tournament/catalog/song.queries';
import { parseLevels, SongRoller } from '@tournament/catalog/song-roller';

describe('SongRoller', () => {
    const rollable = jest.fn();
    const queries = { rollable } as unknown as SongQueries;
    const roller = new SongRoller(queries);
    const scope = { tournamentId: 7, divisionId: 3, group: null, matchId: null };

    beforeEach(() => rollable.mockReset());

    it('asks the catalogue once however many levels are rolled', async () => {
        rollable.mockResolvedValue([
            { id: 1, difficulty: 5 },
            { id: 2, difficulty: 8 },
        ]);

        const picked = await roller.roll({ ...scope, group: 'Pack A', levels: [5, 8] });

        expect(picked).toEqual([
            { level: 5, song: { id: 1, difficulty: 5 } },
            { level: 8, song: { id: 2, difficulty: 8 } },
        ]);
        expect(rollable).toHaveBeenCalledTimes(1);
        expect(rollable).toHaveBeenCalledWith(7, 3, 'Pack A', { allowPlayed: undefined, matchId: null });
    });

    it('answers with an empty slot for a level nothing is available for', async () => {
        rollable.mockResolvedValue([{ id: 1, difficulty: 5 }]);

        expect(await roller.roll({ ...scope, levels: [5, 9] })).toEqual([
            { level: 5, song: { id: 1, difficulty: 5 } },
            { level: 9, song: null },
        ]);
    });

    it('never picks the same song for two levels of one draw', async () => {
        rollable.mockResolvedValue([{ id: 1, difficulty: 5 }]);

        expect(await roller.roll({ ...scope, levels: [5, 5] })).toEqual([
            { level: 5, song: { id: 1, difficulty: 5 } },
            { level: 5, song: null },
        ]);
    });

    it('leaves out the songs the caller says it is already holding', async () => {
        rollable.mockResolvedValue([
            { id: 1, difficulty: 5 },
            { id: 2, difficulty: 5 },
        ]);

        const picked = await roller.roll({ ...scope, levels: [5], excludeSongIds: [1] });

        expect(picked).toEqual([{ level: 5, song: { id: 2, difficulty: 5 } }]);
    });

    it('carries the draw scope to the catalogue', async () => {
        rollable.mockResolvedValue([]);

        await roller.roll({ ...scope, levels: [5], allowPlayed: true, matchId: 11 });

        expect(rollable).toHaveBeenCalledWith(7, 3, null, { allowPlayed: true, matchId: 11 });
    });

    it('rolls nothing when no level is asked for', async () => {
        expect(await roller.roll({ ...scope, levels: [] })).toEqual([]);
        expect(rollable).not.toHaveBeenCalled();
    });
});

describe('parseLevels', () => {
    it('reads a list however it is written', () => {
        expect(parseLevels('9,9,10,10')).toEqual([9, 9, 10, 10]);
        expect(parseLevels('9 9 10 10')).toEqual([9, 9, 10, 10]);
        expect(parseLevels('9-9-10-10')).toEqual([9, 9, 10, 10]);
    });

    it('reads nothing out of nothing', () => {
        expect(parseLevels('')).toEqual([]);
        expect(parseLevels(' , ')).toEqual([]);
    });
});
