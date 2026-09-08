import type { EventEnvelope } from '../../event-envelope';
import type { LiveEventPublisher } from '../../ports/live-event-publisher.interface';
import type {
  LiveEventHandler,
  LiveEventSubscriber,
} from '../../ports/live-event-subscriber.interface';

export class InMemoryLiveEventTransport
  implements LiveEventPublisher, LiveEventSubscriber
{
  private readonly handlers = new Set<LiveEventHandler>();

  async publish(event: EventEnvelope): Promise<void> {
    await Promise.all(
      [...this.handlers].map((handler) => handler({ ...event })),
    );
  }

  async subscribe(handler: LiveEventHandler): Promise<() => Promise<void>> {
    this.handlers.add(handler);

    return async () => {
      this.handlers.delete(handler);
    };
  }
}
