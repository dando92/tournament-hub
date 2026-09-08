import type {
  LiveEventHandler,
  LiveEventSubscriber,
  SequencedLiveEventEnvelope,
} from '@tournament-hub/live-messaging';
import type { BrowserEventBroadcaster } from '@realtime/browser/browser-event-broadcaster';
import { RealtimeEventService } from '@realtime/live-events/realtime-event.service';
import { TournamentRealtimeRegistry } from '@realtime/state/tournament-realtime-registry';

describe('RealtimeEventService', () => {
  it('coordinates subscription, projection, scoped broadcast, and shutdown', async () => {
    let subscribedHandler: LiveEventHandler | undefined;
    const unsubscribe = jest.fn(async () => undefined);
    const subscriber: LiveEventSubscriber = {
      subscribe: jest.fn(async (handler) => {
        subscribedHandler = handler;
        return unsubscribe;
      }),
    };
    const broadcaster: BrowserEventBroadcaster = { broadcast: jest.fn() };
    const registry = new TournamentRealtimeRegistry();
    const service = new RealtimeEventService(subscriber, broadcaster, registry);

    await service.onApplicationBootstrap();
    const event: SequencedLiveEventEnvelope = {
      type: 'ui.match-changed',
      tournamentId: 7,
      payload: { tournamentId: 7, matchId: 3 },
    };
    await subscribedHandler?.(event);

    expect(subscriber.subscribe).toHaveBeenCalledTimes(1);
    expect(broadcaster.broadcast).toHaveBeenCalledTimes(1);
    expect(broadcaster.broadcast).toHaveBeenCalledWith(7, { event: 'MatchUpdate', data: event.payload, sequence: 1 });
    expect(registry.snapshot(7).messages).toHaveLength(1);

    await service.onModuleDestroy();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not require shutdown cleanup when bootstrap did not subscribe', async () => {
    const subscriber = { subscribe: jest.fn() } as unknown as LiveEventSubscriber;
    const broadcaster = { broadcast: jest.fn() } as BrowserEventBroadcaster;
    const service = new RealtimeEventService(
      subscriber,
      broadcaster,
      new TournamentRealtimeRegistry(),
    );

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
