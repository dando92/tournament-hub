import type {
  EventEnvelope,
  IdentifiedEventEnvelope,
} from './event-envelope';

export function isEventEnvelope(value: unknown): value is EventEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Record<string, unknown>;
  return (
    typeof event.type === 'string' &&
    typeof event.tournamentId === 'number' &&
    Object.prototype.hasOwnProperty.call(event, 'payload')
  );
}

export function isIdentifiedEventEnvelope(
  value: unknown,
): value is IdentifiedEventEnvelope {
  return (
    isEventEnvelope(value) &&
    typeof (value as unknown as Record<string, unknown>).id === 'string'
  );
}
