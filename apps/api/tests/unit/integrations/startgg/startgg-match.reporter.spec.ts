import { ExternalMapping, Match } from '@tournament-hub/persistence';
import { StartggClient } from '@tournament-hub/startgg';
import { StartggMatchReporter } from '@api/integrations/startgg/startgg-match.reporter';

describe('StartggMatchReporter', () => {
  const reportBracketSet = jest.fn();
  const find = jest.fn();
  const findOne = jest.fn();

  const reporter = new StartggMatchReporter(
    { reportBracketSet } as unknown as StartggClient,
    { find, findOne } as never,
  );

  function mapping(localType: string, localId: string, externalId: string): ExternalMapping {
    return { provider: 'startgg', localType, localId, externalType: localType === 'match' ? 'set' : 'entrant', externalId } as ExternalMapping;
  }

  function completedMatch(): Match {
    return {
      id: 5,
      phaseGroup: { phase: { division: { tournament: { startggApiKey: ' key ' } } } },
      entrants: [
        { id: 11, participants: [{ player: { id: 101 } }] },
        { id: 12, participants: [{ player: { id: 102 } }] },
      ],
      rounds: [
        {
          id: 2,
          standings: [
            { points: 1, score: { player: { id: 101 } } },
            { points: 3, score: { player: { id: 102 } } },
          ],
        },
        {
          id: 1,
          standings: [
            { points: 4, score: { player: { id: 101 } } },
            { points: 0, score: { player: { id: 102 } } },
          ],
        },
      ],
      matchResult: { playerPoints: [
        { playerId: 101, points: 5, placement: 1 },
        { playerId: 102, points: 3, placement: 2 },
      ] },
    } as Match;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    reportBracketSet.mockResolvedValue([{ id: 'set-1' }]);
  });

  it('refuses a match that has no result to report', async () => {
    const match = { ...completedMatch(), matchResult: null } as Match;

    await expect(reporter.reportCompletedMatch(match)).rejects.toThrow('Match 5 has no completed result');
  });

  it('says nothing about a match this tournament never imported', async () => {
    findOne.mockResolvedValue(null);

    expect(await reporter.reportCompletedMatch(completedMatch())).toBeNull();
    expect(reportBracketSet).not.toHaveBeenCalled();
  });

  it('says nothing when the tournament has no start.gg key configured', async () => {
    findOne.mockResolvedValue(mapping('match', '5', 'set-1'));
    const match = completedMatch();
    match.phaseGroup.phase.division.tournament.startggApiKey = '  ';

    expect(await reporter.reportCompletedMatch(match)).toBeNull();
    expect(reportBracketSet).not.toHaveBeenCalled();
  });

  it('refuses to report a winner start.gg does not know', async () => {
    findOne.mockResolvedValue(mapping('match', '5', 'set-1'));
    find.mockResolvedValue([mapping('entrant', '12', 'external-12')]);

    await expect(reporter.reportCompletedMatch(completedMatch())).rejects.toThrow(
      'Winning entrant 11 is not mapped to a start.gg entrant',
    );
  });

  it('reports the winner and every round, in one lookup of the entrant mappings', async () => {
    findOne.mockResolvedValue(mapping('match', '5', 'set-1'));
    find.mockResolvedValue([mapping('entrant', '11', 'external-11'), mapping('entrant', '12', 'external-12')]);

    const reported = await reporter.reportCompletedMatch(completedMatch());

    expect(find).toHaveBeenCalledTimes(1);
    expect(reported).toEqual([{ id: 'set-1' }]);
    expect(reportBracketSet).toHaveBeenCalledWith('set-1', 'external-11', 'key', [
      { winnerId: 'external-11', gameNum: 1, entrant1Score: 4, entrant2Score: 0 },
      { winnerId: 'external-12', gameNum: 2, entrant1Score: 1, entrant2Score: 3 },
    ]);
  });

  it('reports the set alone when the match is not a head-to-head over rounds', async () => {
    findOne.mockResolvedValue(mapping('match', '5', 'set-1'));
    find.mockResolvedValue([mapping('entrant', '11', 'external-11')]);
    const match = completedMatch();
    match.entrants = [match.entrants[0]];

    await reporter.reportCompletedMatch(match);

    expect(reportBracketSet).toHaveBeenCalledWith('set-1', 'external-11', 'key', undefined);
  });

  it('reports the tiebreak placement rather than choosing from equal points', async () => {
    findOne.mockResolvedValue(mapping('match', '5', 'set-1'));
    find.mockResolvedValue([mapping('entrant', '11', 'external-11'), mapping('entrant', '12', 'external-12')]);
    const match = completedMatch();
    match.matchResult.playerPoints = [
      { playerId: 102, points: 5, placement: 1 },
      { playerId: 101, points: 5, placement: 2 },
    ];

    await reporter.reportCompletedMatch(match);

    expect(reportBracketSet).toHaveBeenCalledWith('set-1', 'external-12', 'key', expect.any(Array));
  });
});
