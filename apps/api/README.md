# API

A NestJS application with PostgreSQL as its only persistence engine. TypeORM
schema synchronization is disabled: every schema change is a versioned
migration in `apps/migrations`.

Run these from the repository root.

## Development

```bash
npm run dev:dependencies
npm run dev
```

The API answers on `http://localhost:3000`, with Swagger UI at `/api-docs`.

## Verification

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

The end-to-end suite creates isolated PostgreSQL databases whose names end in
`_test`, applies every migration, and drops them afterwards.

## Migrations

After changing entity metadata:

```bash
npm run migration:generate --workspace=@tournament-hub/migrations -- src/migrations/MigrationName
```

Review every generated migration before committing it. The Compose stack
applies pending migrations in a one-shot container before the API starts.
