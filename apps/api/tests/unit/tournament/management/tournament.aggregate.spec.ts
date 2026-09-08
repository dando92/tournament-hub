import { Account, Participant, Player, Tournament } from '@tournament-hub/persistence';
import { TournamentAggregate } from '@tournament/management/tournament.aggregate';

function player(id: number, playerName = `Player ${id}`): Player {
  return { id, playerName } as Player;
}

function participant(id: number, playerId: number, overrides: Partial<Participant> = {}): Participant {
  return {
    id,
    player: player(playerId),
    roles: ['competitor'],
    status: 'registered',
    ...overrides,
  } as Participant;
}

function tournament(overrides: Partial<Tournament> = {}): TournamentAggregate {
  return TournamentAggregate.of({
    id: 3,
    name: 'Main',
    status: 'open',
      participants: [],
    ...overrides,
  } as Tournament);
}

describe('TournamentAggregate.register', () => {
  it('adds somebody who is not registered yet', () => {
    const aggregate = tournament();

    const registered = aggregate.register(player(11));

    expect(aggregate.entity.participants).toEqual([registered]);
    expect(registered.roles).toEqual(['competitor']);
    expect(registered.status).toBe('registered');
  });

  it('merges the roles of somebody already registered instead of adding a second row', () => {
    const existing = participant(90, 11, { roles: ['competitor'] });
    const aggregate = tournament({ participants: [existing] });

    const registered = aggregate.register(player(11), ['staff']);

    expect(registered).toBe(existing);
    expect(aggregate.entity.participants).toHaveLength(1);
    expect(existing.roles).toEqual(['competitor', 'staff']);
  });

  it('drops the unknown role as soon as a real one arrives', () => {
    const existing = participant(90, 11, { roles: ['unknown'] });
    const aggregate = tournament({ participants: [existing] });

    aggregate.register(player(11), ['competitor']);

    expect(existing.roles).toEqual(['competitor']);
  });
});

describe('TournamentAggregate staff roles', () => {
  it('links the account behind the player when the participant has none', () => {
    const existing = participant(90, 11, { account: null });
    const aggregate = tournament({ participants: [existing] });

    aggregate.grantStaff(90, { id: 'account-1' } as Account);

    expect(existing.account).toEqual({ id: 'account-1' });
    expect(existing.roles).toEqual(['competitor', 'staff']);
  });

  it('keeps the account the participant already had', () => {
    const existing = participant(90, 11, { account: { id: 'their-own' } as Account });
    const aggregate = tournament({ participants: [existing] });

    aggregate.grantStaff(90, { id: 'another' } as Account);

    expect(existing.account).toEqual({ id: 'their-own' });
  });

  it('leaves somebody whose only role was staff as unknown', () => {
    const existing = participant(90, 11, { roles: ['staff'] });
    const aggregate = tournament({ participants: [existing] });

    aggregate.revokeStaff(90);

    expect(existing.roles).toEqual(['unknown']);
  });

  it('refuses a participant of another tournament', () => {
    expect(() => tournament().grantStaff(404, null)).toThrow('Participant 404 not found');
  });
});

describe('TournamentAggregate.unregister', () => {
  it('takes them off the roster and hands the row to the store', () => {
    const existing = participant(90, 11);
    const aggregate = tournament({ participants: [existing, participant(91, 12)] });

    aggregate.unregister(90);

    expect(aggregate.entity.participants.map((each) => each.id)).toEqual([91]);
    expect(aggregate.removal).toBe(existing);
  });
});

describe('TournamentAggregate lifecycle', () => {
  it('closes a tournament once and says so', () => {
    const aggregate = tournament();

    expect(aggregate.close()).toBe(true);
    expect(aggregate.entity.status).toBe('closed');
    expect(aggregate.entity.closedAt).toBeInstanceOf(Date);
  });

  it('answers that a closed tournament did not move, so nothing is announced', () => {
    const aggregate = tournament({ status: 'closed' });

    expect(aggregate.close()).toBe(false);
  });

  it('reopens and clears the moment it was closed', () => {
    const aggregate = tournament({ status: 'closed', closedAt: new Date() });

    expect(aggregate.reopen()).toBe(true);
    expect(aggregate.entity.status).toBe('open');
    expect(aggregate.entity.closedAt).toBeNull();
  });

  it('refuses a change to a closed tournament', () => {
    expect(() => tournament({ status: 'closed' }).assertOpen()).toThrow('closed and must be reopened');
  });
});

describe('TournamentAggregate.describe', () => {
  it('changes only the fields the request names', () => {
    const aggregate = tournament();

    aggregate.describe({ name: 'Renamed' });

    expect(aggregate.entity.name).toBe('Renamed');
    expect(aggregate.entity.status).toBe('open');
  });

  it('takes a start.gg key being cleared, which is not the same as being left alone', () => {
    const aggregate = tournament({ startggApiKey: 'secret' });

    aggregate.describe({ startggApiKey: null });

    expect(aggregate.entity.startggApiKey).toBeNull();
  });
});
