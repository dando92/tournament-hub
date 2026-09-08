import type { SequencedLiveEventEnvelope } from '../event-envelope';

export type LiveEventHandler = (
  event: SequencedLiveEventEnvelope,
) => void | Promise<void>;

export interface LiveEventSubscriber {
  subscribe(handler: LiveEventHandler): Promise<() => Promise<void>>;
}
