process.env.JWT_SECRET = 'e2e-test-secret';
process.env.STARTGG_API_URL =
  'http://127.0.0.1:1/startgg-not-available-in-this-suite';
process.env.LOCAL_FIXTURE_SYNCSTART_URL = '';
process.env.DATABASE_HOST = process.env.TEST_DATABASE_HOST ?? '127.0.0.1';
process.env.DATABASE_PORT =
  process.env.TEST_DATABASE_PORT ?? process.env.POSTGRES_PORT ?? '5432';
process.env.DATABASE_USER =
  process.env.TEST_DATABASE_USER ?? 'tournament_hub';
process.env.DATABASE_PASSWORD =
  process.env.TEST_DATABASE_PASSWORD ?? 'tournament_hub';
process.env.DATABASE_NAME = 'tournament_hub_application_test';
process.env.DATABASE_SSL = process.env.TEST_DATABASE_SSL ?? 'false';
process.env.EVENT_STREAM = 'tournament-hub.e2e.events';
process.env.EVENT_CONSUMER_GROUP = 'tournament-hub-e2e';
process.env.LIVE_EVENT_CHANNEL = 'tournament-hub.e2e.live';
