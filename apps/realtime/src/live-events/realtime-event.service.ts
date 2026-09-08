import { Inject, Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import {
  LIVE_EVENT_SUBSCRIBER,
  type LiveEventSubscriber,
  type SequencedLiveEventEnvelope,
} from '@tournament-hub/live-messaging';
import {
  BROWSER_EVENT_BROADCASTER,
  type BrowserEventBroadcaster,
} from '../browser/browser-event-broadcaster';
import { TournamentRealtimeRegistry } from '../state/tournament-realtime-registry';

@Injectable()
export class RealtimeEventService implements OnApplicationBootstrap, OnModuleDestroy {
  private unsubscribe?: () => Promise<void>;

  constructor(
    @Inject(LIVE_EVENT_SUBSCRIBER) private readonly subscriber: LiveEventSubscriber,
    @Inject(BROWSER_EVENT_BROADCASTER) private readonly broadcaster: BrowserEventBroadcaster,
    private readonly registry: TournamentRealtimeRegistry,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.unsubscribe = await this.subscriber.subscribe((event) => this.forward(event));
  }

  async onModuleDestroy(): Promise<void> {
    await this.unsubscribe?.();
  }

  private forward(event: SequencedLiveEventEnvelope): void {
    const state = this.registry.getOrCreate(event.tournamentId);
    this.broadcaster.broadcast(event.tournamentId, state.apply(event));
  }
}
