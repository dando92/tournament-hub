export interface EventEnvelope<TPayload = unknown> {
  type: string;
  tournamentId: number;
  payload: TPayload;
}

export interface IdentifiedEventEnvelope<TPayload = unknown>
  extends EventEnvelope<TPayload> {
  id: string;
}

export interface SequencedLiveEventEnvelope<TPayload = unknown>
  extends EventEnvelope<TPayload> {
  sequence?: number;
}
