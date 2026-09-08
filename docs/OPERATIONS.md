# Operations

## Ports

| Port | What answers |
| --- | --- |
| `80` | The application, and the single browser gateway |
| `3000` | The API, with Swagger UI at `/api-docs` |
| `3003` | Realtime — health, snapshots, and browser WebSockets on `/uiupdatehub` |
| `5432` | PostgreSQL |
| `6379` | Redis |
| `5173` | Vite, when running from a shell instead of Docker |

Only port `80` needs to be reachable from outside. The frontend's nginx proxies
`/api/` and `/realtime/` across the private Compose network, so browser
requests stay same-origin and a tunnel exposes one port:

```bash
cloudflared tunnel --url http://localhost
```

The direct API and realtime ports are published for diagnostics. They do not
need to be internet-accessible, and PostgreSQL and Redis never do.

## Health

```bash
npm run status
```

That prints container health and the API's own view of its dependencies.
Directly:

```bash
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
curl http://localhost:3003/health/ready
```

Readiness reports PostgreSQL, Redis and the migration runner separately. If a
dependency is down, `/health/live` keeps answering while `/health/ready`
returns `503` and names what failed.

## Images and builds

Every image is a target of the repository-root `Dockerfile`. Dependencies are
installed once and the monorepo is compiled once, in stages every target
shares, so one source change does not repeat the install or recompile the
shared packages per service.

`npm run build` schedules workspaces against the dependency graph it reads from
the manifests and runs as many at once as memory allows, budgeting about 1.5 GB
per build. The Docker VM's memory therefore decides build concurrency: a 2 GB
VM builds one workspace at a time, and raising the WSL memory limit raises the
concurrency with no repository change.

## Logs

```bash
npm run logs
docker compose logs api
docker compose logs migrations
```

Services are `postgres`, `redis`, `migrations`, `api`, `realtime` and
`frontend`. `Ctrl+C` stops following; it does not stop the stack.

If the migration container fails, the API deliberately stays stopped — read
`docker compose logs migrations` first.

## Restart

```bash
npm run down          # stops containers, keeps the volumes
npm run up            # brings them back with the data still there
docker compose restart api realtime frontend
```

The frontend reads `PUBLIC_API_URL` and `PUBLIC_REALTIME_URL` at container
start and writes `/runtime-config.js`. Changing either needs a container
restart, not an image rebuild.

## Backup and restore

While the stack is running:

```bash
docker compose exec -T postgres pg_dump -U tournament_hub --clean --if-exists --no-owner tournament_hub > backup.sql
```

Restore it, from a Bash-compatible shell:

```bash
docker compose exec -T postgres psql -U tournament_hub -d tournament_hub < backup.sql
```

From PowerShell:

```powershell
Get-Content -Raw .\backup.sql | docker compose exec -T postgres psql -U tournament_hub -d tournament_hub
```

Replace the user and database if `.env` overrides them. Backups hold
application data and must not be committed.

## Reset

Destructive, and never part of normal startup. It removes the PostgreSQL and
Redis volumes, rebuilds, and recreates the sample tournament:

```bash
npm run reset
```

Take a backup first if the data matters.

## The seeded administrator and the sample tournament

The migration runner creates the administrator from `INITIAL_ADMIN_USERNAME`
and `INITIAL_ADMIN_PASSWORD`, but only when the account does not already exist
— changing the password afterwards has no effect, so change it in the
application or start from a clean database.

The same one-shot container writes an idempotent sample tournament when
`LOCAL_FIXTURE_ENABLED` is exactly `true`. Set it to anything else for a real
installation.

## Measuring a loaded stack

An empty database is the right floor for using the application and the wrong
one for measuring it. Three commands make a run measurable.

**A database worth measuring.** `tools/dataset-seeder` writes one
deterministically:

```bash
npm run seed:dataset -- --profile venue --seed 42 --reset
```

`--reset` empties every data table first, keeping accounts and applied
migrations, so a profile always writes onto a known floor. Without it, every
run appends — which is how a database is filled a run at a time:

```bash
npm run seed:dataset -- --profile venue           # another tournament
npm run seed:dataset -- --profile venue --into 2  # more of tournament 2
npm run seed:dataset -- --profile venue --into last
```

The profiles are `venue` (one tournament day, ~200 competitors), `season`
(archive weight: many closed tournaments, 20 000+ entrants, no matches) and
`stress` (an order of magnitude above `venue`). `--scale` multiplies how much
of the installation there is without changing the shape of a division, which is
what keeps a ratio between two profiles meaningful.

**What one request costs.** With `REQUEST_TIMING_ENABLED=true`, the API writes
one NDJSON line per request:

```text
{"metric":"request","method":"GET","route":"/tournaments/:tournamentId/schedules",
 "status":200,"ms":127.7,"queries":3,"databaseMs":111,"rows":2237}
```

`queries` is the number to read first. A route that issues thirty of them to
draw one page reads the same on a stopwatch as one that issues three, until the
dataset grows.

**What the database actually ran.** PostgreSQL starts with
`pg_stat_statements` preloaded. Reset, run, report:

```bash
npm run bench:pgstat -- --reset
# drive the load
npm run bench:pgstat -- --top 20
```

It orders by total time rather than by mean, because a two-millisecond query
run four thousand times is the finding and a mean hides it.

Absolute milliseconds measured this way are not production numbers. What
transfers is the ratio between two profiles of the same shape.

## Recovery

- After a normal stop and start, `npm run status` must show retained data and
  every dependency up.
- Redis Pub/Sub messages are replaceable and may be lost while Redis, a
  publisher or a subscriber is unavailable. Authoritative state stays in
  PostgreSQL, and clients recover through HTTP snapshots.
- Realtime can be stopped without affecting HTTP behaviour or authoritative
  state. On reconnect or a sequence gap the frontend reloads its snapshots.
- Tournament Hub makes no outward call to a venue. A run a control room could
  not deliver waits in that control room's own outbox until an operator resends
  it.
