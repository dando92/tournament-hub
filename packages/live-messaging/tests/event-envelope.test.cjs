const assert = require('node:assert/strict');
const test = require('node:test');
const {
  InMemoryLiveEventTransport,
  isEventEnvelope,
  isIdentifiedEventEnvelope,
} = require('../dist/index.js');

const event = {
  type: 'syncstart.song-completed',
  tournamentId: 42,
  payload: { lobbyId: 'lobby-1' },
};

test('validates event envelopes without validating their payloads', () => {
  assert.equal(isEventEnvelope(event), true);
  assert.equal(isEventEnvelope({ ...event, tournamentId: undefined }), false);
  assert.equal(isEventEnvelope({ ...event, payload: undefined }), true);
  const { payload: _payload, ...withoutPayload } = event;
  assert.equal(isEventEnvelope(withoutPayload), false);
});

test('requires an id only for identified event envelopes', () => {
  assert.equal(isIdentifiedEventEnvelope(event), false);
  assert.equal(isIdentifiedEventEnvelope({ ...event, id: 'completion-1' }), true);
});

test('delivers published events to active in-memory subscribers', async () => {
  const transport = new InMemoryLiveEventTransport();
  const received = [];
  const unsubscribe = await transport.subscribe((published) => received.push(published));

  await transport.publish(event);
  await unsubscribe();
  await transport.publish({ ...event, type: 'ui.warning' });

  assert.deepEqual(received, [event]);
});
