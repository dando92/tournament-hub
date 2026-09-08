import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";

import { AppModule } from "../../../src/app.module";
import { dropTestDatabase, getTestDatabaseName, resetMigratedTestDatabase } from "../../support/postgres-test-database";

const database = getTestDatabaseName("connection");

process.env.DATABASE_NAME = database;

describe("Database connection settings (e2e)", () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        const migrations = await resetMigratedTestDatabase(database);
        await migrations.destroy();

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        dataSource = moduleFixture.get(DataSource);
    });

    afterAll(async () => {
        await app?.close();
        await dropTestDatabase(database);
    });

    it("bounds how long one statement and one open transaction may hold a connection", async () => {
        const [settings] = await dataSource.query(
            `SELECT current_setting('statement_timeout') AS "statementTimeout",
                    current_setting('idle_in_transaction_session_timeout') AS "idleTransactionTimeout",
                    current_setting('application_name') AS "applicationName"`,
        );

        expect(settings.statementTimeout).toBe("15s");
        expect(settings.idleTransactionTimeout).toBe("30s");
        expect(settings.applicationName).toBe("tournament-hub-api");
    });
});
