# Tournament Hub

Tournament Hub runs a tournament: its structure, its schedule, the people in
it, the songs they play, the scores that come back, and the standings that
follow. It is self-contained and provider-independent — one command brings up
the whole stack on a laptop, with no cloud account and no vendor credentials.

The cabinets themselves are not its job. A venue drives those with the
[Lobby Control Room](https://github.com/dando92/lobby-control-room), a separate
product that reaches Tournament Hub only through the versioned HTTP contract
published under `/v1`.

## Repository structure

```text
apps/
  api/        NestJS HTTP API, the application entrypoints, and the /v1 venue contract
  migrations/ One-shot PostgreSQL migrations, the first administrator, the local fixture
  realtime/   Browser WebSocket fan-out and snapshots
  frontend/   React and Vite web application, and the browser gateway
packages/
  contracts/      Transport-neutral DTOs shared by the API and its frontend
  scoring/        Scoring systems and their pure calculations
  brackets/       Bracket shapes and their pure plan generation
  persistence/    Shared PostgreSQL entity metadata
  live-messaging/ Redis Pub/Sub live-message transport
  startgg/        The Start.gg provider client
tools/
  dataset-seeder/ A deterministic bulk seeder, for measuring a loaded stack
```

PostgreSQL is the authoritative store. Redis Pub/Sub carries replaceable live
messages only — nothing authoritative is ever read back from it. Application
logic is stateless; only connection adapters keep volatile in-memory state.

## Requirements

- Node.js 22 or later, and npm
- Docker with Compose v2, for the containerized stack (Docker Desktop running on
  Windows or macOS)

## Run the whole stack with Docker

```bash
npm ci
npm run up
```

That builds the images, starts PostgreSQL, Redis, the one-shot migration
runner, the API, realtime and the frontend, and waits until each is healthy.
The migration runner finishes before the API starts, and the API is ready
before the frontend comes up.

- Application: `http://localhost`
- API: `http://localhost:3000`, Swagger UI at `/api-docs`
- Realtime: `http://localhost:3003`

Sign in with `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` — `admin` and
`local-development-password` unless a `.env` says otherwise. A deterministic
sample tournament is created on an empty database, so a fresh clone has
something to look at.

```bash
npm run status
npm run logs
npm run down
```

`npm run reset` deletes the database and Redis volumes and starts again.

Nginx in the frontend container is the single browser gateway: a public tunnel
needs to expose only port `80`. PostgreSQL, Redis, the API and realtime stay
private behind it.

## Run it from a shell

```bash
npm ci
cp .env.example .env
npm run dev:dependencies
npm run dev
```

`dev:dependencies` starts only PostgreSQL, Redis and the migration runner in
Docker; `dev` runs the API, realtime and Vite on the host with reload.

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

Vite proxies browser API and realtime traffic through `http://localhost:5173`,
so a development tunnel also needs only one port.

## Verify it

```bash
npm run verify
```

That checks architecture boundaries, builds every workspace, lints, and runs
the contract, unit and PostgreSQL-backed end-to-end suites. Start
`npm run dev:dependencies` first — the end-to-end suites need a real database.

Against a running Compose stack:

```bash
npm run verify:local
```

## Configuration

Every setting is an environment variable, listed with its local default in
[`.env.example`](.env.example). Copy it to `.env` to override ports, database
credentials or the seeded administrator. Nothing in that file is a secret, and
nothing in it is suitable for a deployment.

Ports, health endpoints, backup and restore, seeding a database worth
measuring, and what to do when something is down are in
[docs/OPERATIONS.md](docs/OPERATIONS.md).
