import type { EventEnvelope } from '../event-envelope';

export interface LiveEventPublisher {
  publish(event: EventEnvelope): Promise<void>;
}
