const apiUrl = process.env.LOCAL_API_URL ?? `http://127.0.0.1:${process.env.API_PORT ?? 3000}`;
const realtimeUrl = process.env.LOCAL_REALTIME_URL ?? `http://127.0.0.1:${process.env.REALTIME_PORT ?? 3003}`;

try {
  const response = await fetch(`${apiUrl}/health/ready`);
  const result = await response.json();
  console.log('\nAPI readiness and migration status:');
  console.log(JSON.stringify(result, null, 2));
  if (!response.ok) process.exitCode = 1;
} catch (error) {
  console.error(`\nAPI readiness unavailable at ${apiUrl}: ${error.message}`);
  process.exitCode = 1;
}

try {
  const response = await fetch(`${realtimeUrl}/health/ready`);
  const result = await response.json();
  console.log('\nRealtime readiness:');
  console.log(JSON.stringify(result, null, 2));
  if (!response.ok) process.exitCode = 1;
} catch (error) {
  console.error(`\nRealtime readiness unavailable at ${realtimeUrl}: ${error.message}`);
  process.exitCode = 1;
}
