
const apiUrl = process.env.LOCAL_API_URL ?? `http://127.0.0.1:${process.env.API_PORT ?? 3000}`;
const frontendUrl = process.env.LOCAL_FRONTEND_URL ?? `http://127.0.0.1:${process.env.FRONTEND_PORT ?? 80}`;
const realtimeUrl = process.env.LOCAL_REALTIME_URL ?? `http://127.0.0.1:${process.env.REALTIME_PORT ?? 3003}`;
const seedName = process.env.LOCAL_FIXTURE_TOURNAMENT_NAME ?? 'Local E2E Tournament';

async function expectResponse(label, url, predicate = () => true) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  const body = await response.text();
  if (!predicate(body, response)) throw new Error(`${label} returned an unexpected response`);
  console.log(`PASS: ${label}`);
}

await expectResponse('API liveness', `${apiUrl}/health/live`, (body) => JSON.parse(body).status === 'ok');
await expectResponse('API readiness', `${apiUrl}/health/ready`, (body) => {
  const result = JSON.parse(body);
  return result.status === 'ready'
    && result.dependencies.postgres.status === 'up'
    && result.dependencies.redis.status === 'up'
    && result.dependencies.migrations.status === 'up';
});
await expectResponse('realtime liveness', `${realtimeUrl}/health/live`, (body) => JSON.parse(body).status === 'ok');
await expectResponse('realtime readiness', `${realtimeUrl}/health/ready`, (body) => {
  const result = JSON.parse(body);
  return result.status === 'ready' && result.dependencies.redis.status === 'up';
});
await expectResponse('Swagger document', `${apiUrl}/api-docs-json`, (body) => JSON.parse(body).openapi !== undefined);
await expectResponse('deterministic local seed', `${apiUrl}/tournaments/public`, (body) => {
  const tournaments = JSON.parse(body);
  return tournaments.some((tournament) => tournament.name === seedName);
});
await expectResponse('frontend', frontendUrl, (body) => body.includes('<div id="root">'));
await expectResponse('frontend API gateway', `${frontendUrl}/api/health/live`, (body) => JSON.parse(body).status === 'ok');
await expectResponse('frontend realtime gateway', `${frontendUrl}/realtime/health/live`, (body) => JSON.parse(body).status === 'ok');
