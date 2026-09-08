import { MigrationInterface, QueryRunner } from "typeorm";

// The first release's schema, in one migration. Everything above the view is
// generated from the entity metadata; the normalized-name index and the
// competition_address view are written by hand because an expression index and
// a view cannot be declared in entity metadata.

export class BaselineSchema1788901243690 implements MigrationInterface {
    name = 'BaselineSchema1788901243690'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "player" ("id" SERIAL NOT NULL, "playerName" character varying NOT NULL, "nationality" character varying(2) NOT NULL DEFAULT '', CONSTRAINT "CHK_player_nationality" CHECK ("nationality" = '' OR "nationality" ~ '^[A-Z]{2}$'), CONSTRAINT "PK_65edadc946a7faf4b638d5e8885" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "account" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "grooveStatsApi" character varying NOT NULL DEFAULT '', "isAdmin" boolean NOT NULL DEFAULT false, "isTournamentCreator" boolean NOT NULL DEFAULT false, "profilePicture" text NOT NULL DEFAULT '', "playerId" integer, CONSTRAINT "REL_ece9bbff16e0733a1df91b1c16" UNIQUE ("playerId"), CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "advancement_rule" ("id" SERIAL NOT NULL, "sourceKind" character varying NOT NULL, "sourceId" integer NOT NULL, "sourcePlacement" integer NOT NULL, "targetKind" character varying NOT NULL, "targetId" integer NOT NULL, "targetSlot" integer NOT NULL, CONSTRAINT "PK_ed0fc2eaa06bdd46e6e3cabfcc7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_advancement_rule_target" ON "advancement_rule" ("targetKind", "targetId") `);
        await queryRunner.query(`CREATE INDEX "IDX_advancement_rule_source" ON "advancement_rule" ("sourceKind", "sourceId") `);
        await queryRunner.query(`CREATE TABLE "phase_group_entrant" ("id" SERIAL NOT NULL, "seedNum" integer, "slot" integer, "status" character varying NOT NULL DEFAULT 'active', "phaseGroupId" integer, "entrantId" integer, "sourceAdvancementRuleId" integer, CONSTRAINT "PK_c47e8944f97d923f2b700ededc5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_phase_group_entrant_source_advancement_rule" ON "phase_group_entrant" ("sourceAdvancementRuleId") `);
        await queryRunner.query(`CREATE INDEX "IDX_phase_group_entrant_entrant" ON "phase_group_entrant" ("entrantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_phase_group_entrant_phase_group" ON "phase_group_entrant" ("phaseGroupId") `);
        await queryRunner.query(`CREATE TABLE "entrant" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'player', "status" character varying NOT NULL DEFAULT 'active', "seedNum" integer, "divisionId" integer, CONSTRAINT "PK_20598fd0f599674e629f7428d7b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_entrant_division" ON "entrant" ("divisionId") `);
        await queryRunner.query(`CREATE TABLE "participant" ("id" SERIAL NOT NULL, "roles" text array NOT NULL DEFAULT '{unknown}', "status" character varying NOT NULL DEFAULT 'registered', "tournamentId" integer, "playerId" integer NOT NULL, "accountId" uuid, CONSTRAINT "PK_64da4237f502041781ca15d4c41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_participant_account" ON "participant" ("accountId") `);
        await queryRunner.query(`CREATE INDEX "IDX_participant_player" ON "participant" ("playerId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_participant_tournament_player" ON "participant" ("tournamentId", "playerId") `);
        await queryRunner.query(`CREATE TABLE "tournament" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'open', "closedAt" TIMESTAMP WITH TIME ZONE, "startggApiKey" character varying, "planVersion" integer NOT NULL DEFAULT '0', "controlRoomKeyHash" character varying(64), "controlRoomKeyIssuedAt" TIMESTAMP WITH TIME ZONE, "controlRoomKeyLastUsedAt" TIMESTAMP WITH TIME ZONE, "defaultScoringSystem" character varying NOT NULL DEFAULT 'PlacementPointsWithFailZero', CONSTRAINT "CHK_tournament_status" CHECK ("status" IN ('open', 'closed')), CONSTRAINT "PK_449f912ba2b62be003f0c22e767" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_tournament_control_room_key_hash" ON "tournament" ("controlRoomKeyHash") `);
        await queryRunner.query(`CREATE TABLE "song" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "artist" character varying, "group" character varying NOT NULL, "difficulty" integer NOT NULL, "chartDifficulty" character varying, "tournamentId" integer, CONSTRAINT "CHK_song_chart_difficulty" CHECK ("chartDifficulty" IN ('Novice', 'Easy', 'Medium', 'Hard', 'Expert', 'Edit')), CONSTRAINT "PK_baaa977f861cce6ff954ccee285" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_song_tournament" ON "song" ("tournamentId") `);
        await queryRunner.query(`CREATE TABLE "score" ("id" SERIAL NOT NULL, "percentage" numeric(5,2) NOT NULL, "isFailed" boolean NOT NULL, "source" character varying NOT NULL DEFAULT 'manual', "songId" integer, "playerId" integer, CONSTRAINT "CHK_score_source" CHECK ("source" IN ('manual', 'control-room')), CONSTRAINT "PK_1770f42c61451103f5514134078" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_score_song_player_id" ON "score" ("songId", "playerId", "id") `);
        await queryRunner.query(`CREATE TABLE "standing" ("id" SERIAL NOT NULL, "points" integer NOT NULL, "scoreId" integer, "playerId" integer NOT NULL, "roundId" integer, CONSTRAINT "REL_90f3771a995658f98fc55e07a8" UNIQUE ("scoreId"), CONSTRAINT "PK_b7eda5b232d8a6083277a4960ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_standing_player" ON "standing" ("playerId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_76a9cb5154ea8d65024989a39e" ON "standing" ("roundId", "playerId") `);
        await queryRunner.query(`CREATE TABLE "round" ("id" SERIAL NOT NULL, "matchId" integer, "songId" integer, CONSTRAINT "PK_34bd959f3f4a90eb86e4ae24d2d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_round_song" ON "round" ("songId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9df0a40a5d3842afc294a88e83" ON "round" ("matchId") WHERE "songId" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dfa041d32ed2f7a150188a2da7" ON "round" ("matchId", "songId") `);
        await queryRunner.query(`CREATE TABLE "match_result" ("id" SERIAL NOT NULL, "playerPoints" jsonb NOT NULL, CONSTRAINT "PK_a4450d3f8956bd21c5c916ff273" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "match_tiebreak_standing" ("id" SERIAL NOT NULL, "manualPoints" integer, "tiebreakId" integer NOT NULL, "playerId" integer NOT NULL, "scoreId" integer, CONSTRAINT "REL_cbcff6220a97011ab94ee89542" UNIQUE ("scoreId"), CONSTRAINT "PK_b5811b14144f69c841999b259be" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_match_tiebreak_standing_player_lookup" ON "match_tiebreak_standing" ("playerId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_match_tiebreak_standing_player" ON "match_tiebreak_standing" ("tiebreakId", "playerId") `);
        await queryRunner.query(`CREATE TABLE "match_tiebreak" ("id" SERIAL NOT NULL, "sequence" integer NOT NULL, "invalidated" boolean NOT NULL DEFAULT false, "matchId" integer NOT NULL, "songId" integer, CONSTRAINT "PK_20ed2a26de4f6be38b0a7f172f4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_match_tiebreak_song" ON "match_tiebreak" ("songId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_match_tiebreak_sequence" ON "match_tiebreak" ("matchId", "sequence") `);
        await queryRunner.query(`CREATE TABLE "match" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "subtitle" character varying, "notes" character varying, "scoringSystem" character varying NOT NULL, "active" boolean NOT NULL DEFAULT false, "state" character varying NOT NULL DEFAULT 'open', "matchResultId" integer, "phaseGroupId" integer, CONSTRAINT "REL_418d16654c78f780aec5cc5f6e" UNIQUE ("matchResultId"), CONSTRAINT "PK_92b6c3a6631dd5b24a67c69f69d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_match_phase_group" ON "match" ("phaseGroupId") `);
        await queryRunner.query(`CREATE TABLE "phase_group" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "displayIdentifier" character varying, "bracketType" character varying, "state" character varying NOT NULL DEFAULT 'pending', "phaseId" integer, CONSTRAINT "PK_ebfc4701a6fc51fac5c7e8ecdf6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_phase_group_phase" ON "phase_group" ("phaseId") `);
        await queryRunner.query(`CREATE TABLE "phase" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "divisionId" integer, CONSTRAINT "PK_a9cac5076fb19818ed0f871bea8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_phase_division" ON "phase" ("divisionId") `);
        await queryRunner.query(`CREATE TABLE "division" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "structureVersion" integer NOT NULL DEFAULT '0', "tournamentId" integer, CONSTRAINT "PK_b6f0d207e38106dbddabab3a078" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_division_tournament" ON "division" ("tournamentId") `);
        await queryRunner.query(`CREATE TABLE "external_mapping" ("id" SERIAL NOT NULL, "provider" character varying NOT NULL, "localType" character varying NOT NULL, "localId" character varying NOT NULL, "externalType" character varying NOT NULL, "externalId" character varying NOT NULL, "externalSlug" character varying, "metadata" text, CONSTRAINT "PK_6e129d62ced4818acc267e3dd7a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_external_mapping_identity" ON "external_mapping" ("provider", "localType", "localId", "externalType", "externalId") `);
        await queryRunner.query(`CREATE TABLE "schedule_entry" ("id" SERIAL NOT NULL, "position" integer NOT NULL, "expectedDurationMinutes" integer NOT NULL, "startedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "scheduleId" integer, "matchId" integer, CONSTRAINT "PK_3600430a8792b80c5080826616a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_schedule_entry_match" ON "schedule_entry" ("matchId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_schedule_entry_position" ON "schedule_entry" ("scheduleId", "position") `);
        await queryRunner.query(`CREATE TABLE "schedule" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "willStartAt" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying NOT NULL DEFAULT 'inactive', "currentEntryId" integer, "staleCode" character varying, "staleDetails" jsonb, "interruptionCode" character varying, "interruptionDetails" jsonb, "interruptedAt" TIMESTAMP WITH TIME ZONE, "archivedAt" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "tournamentId" integer, CONSTRAINT "CHK_schedule_status" CHECK ("status" IN ('inactive', 'running', 'completed')), CONSTRAINT "PK_1c05e42aec7371641193e180046" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_schedule_current_entry" ON "schedule" ("currentEntryId") `);
        await queryRunner.query(`CREATE INDEX "IDX_schedule_tournament" ON "schedule" ("tournamentId") `);
        await queryRunner.query(`CREATE TABLE "run_submission" ("id" SERIAL NOT NULL, "submissionId" character varying(200) NOT NULL, "receivedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "outcome" jsonb, "tournamentId" integer NOT NULL, CONSTRAINT "PK_463c3bcc5fd154a39e8aa86d570" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_run_submission_identity" ON "run_submission" ("tournamentId", "submissionId") `);
        await queryRunner.query(`CREATE TABLE "entrant_participants_participant" ("entrantId" integer NOT NULL, "participantId" integer NOT NULL, CONSTRAINT "PK_90cf119bc96d4110155ed741a66" PRIMARY KEY ("entrantId", "participantId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b50199abefb09e6fd40c324817" ON "entrant_participants_participant" ("entrantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_55d3161747bcc47846f889e6c8" ON "entrant_participants_participant" ("participantId") `);
        await queryRunner.query(`CREATE TABLE "match_entrants_entrant" ("matchId" integer NOT NULL, "entrantId" integer NOT NULL, CONSTRAINT "PK_74770c6fdeac09963e013888a20" PRIMARY KEY ("matchId", "entrantId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f229995fe721169a8a80a637df" ON "match_entrants_entrant" ("matchId") `);
        await queryRunner.query(`CREATE INDEX "IDX_40a374a207499f6a7decdcf41d" ON "match_entrants_entrant" ("entrantId") `);
        await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "FK_ece9bbff16e0733a1df91b1c16c" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "phase_group_entrant" ADD CONSTRAINT "FK_a828a232dd61e9c934e5d4e02af" FOREIGN KEY ("phaseGroupId") REFERENCES "phase_group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "phase_group_entrant" ADD CONSTRAINT "FK_7bef3689e57e31efe6e7999813a" FOREIGN KEY ("entrantId") REFERENCES "entrant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "phase_group_entrant" ADD CONSTRAINT "FK_33bc939e21306276c3332d213a7" FOREIGN KEY ("sourceAdvancementRuleId") REFERENCES "advancement_rule"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "entrant" ADD CONSTRAINT "FK_5f0fae8a9da1a6e3caf192956a9" FOREIGN KEY ("divisionId") REFERENCES "division"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "FK_99cba5cb409eb7e657295b474ba" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "FK_93e11e907b1503ff0ce88b261f6" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "FK_e8e5c25554f3f5a3beff3f44371" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "song" ADD CONSTRAINT "FK_2d01b477ae344c1b2799b2ce3ba" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "score" ADD CONSTRAINT "FK_075dd3268b7d4953406d1329358" FOREIGN KEY ("songId") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "score" ADD CONSTRAINT "FK_66f5fb8ee865712db248080d5ea" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "standing" ADD CONSTRAINT "FK_90f3771a995658f98fc55e07a8b" FOREIGN KEY ("scoreId") REFERENCES "score"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "standing" ADD CONSTRAINT "FK_247c99355e4604a24fbe04b507d" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "standing" ADD CONSTRAINT "FK_b6e4c4c42e9883cbdb8adcc4b93" FOREIGN KEY ("roundId") REFERENCES "round"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "round" ADD CONSTRAINT "FK_7f3ebe2c9b6582d68973dd1de22" FOREIGN KEY ("matchId") REFERENCES "match"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "round" ADD CONSTRAINT "FK_4bbb501900dff6ad36bcb818cd1" FOREIGN KEY ("songId") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_tiebreak_standing" ADD CONSTRAINT "FK_match_tiebreak_standing_tiebreak" FOREIGN KEY ("tiebreakId") REFERENCES "match_tiebreak"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_tiebreak_standing" ADD CONSTRAINT "FK_match_tiebreak_standing_player" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_tiebreak_standing" ADD CONSTRAINT "FK_match_tiebreak_standing_score" FOREIGN KEY ("scoreId") REFERENCES "score"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_tiebreak" ADD CONSTRAINT "FK_match_tiebreak_match" FOREIGN KEY ("matchId") REFERENCES "match"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_tiebreak" ADD CONSTRAINT "FK_match_tiebreak_song" FOREIGN KEY ("songId") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match" ADD CONSTRAINT "FK_418d16654c78f780aec5cc5f6e5" FOREIGN KEY ("matchResultId") REFERENCES "match_result"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match" ADD CONSTRAINT "FK_14084794dd359f5338573d5fd23" FOREIGN KEY ("phaseGroupId") REFERENCES "phase_group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "phase_group" ADD CONSTRAINT "FK_72ec86c141d930a9d55dc5d3f7b" FOREIGN KEY ("phaseId") REFERENCES "phase"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "phase" ADD CONSTRAINT "FK_e7d5b67662d6357f3b6f5a8439a" FOREIGN KEY ("divisionId") REFERENCES "division"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "division" ADD CONSTRAINT "FK_987d6d8e6edb01c1f371ef08456" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedule_entry" ADD CONSTRAINT "FK_schedule_entry_schedule" FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedule_entry" ADD CONSTRAINT "FK_schedule_entry_match" FOREIGN KEY ("matchId") REFERENCES "match"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedule" ADD CONSTRAINT "FK_schedule_current_entry" FOREIGN KEY ("currentEntryId") REFERENCES "schedule_entry"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "schedule" ADD CONSTRAINT "FK_schedule_tournament" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "run_submission" ADD CONSTRAINT "FK_run_submission_tournament" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "entrant_participants_participant" ADD CONSTRAINT "FK_b50199abefb09e6fd40c324817d" FOREIGN KEY ("entrantId") REFERENCES "entrant"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "entrant_participants_participant" ADD CONSTRAINT "FK_55d3161747bcc47846f889e6c8f" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_entrants_entrant" ADD CONSTRAINT "FK_f229995fe721169a8a80a637df7" FOREIGN KEY ("matchId") REFERENCES "match"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "match_entrants_entrant" ADD CONSTRAINT "FK_40a374a207499f6a7decdcf41d8" FOREIGN KEY ("entrantId") REFERENCES "entrant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_player_normalized_name" ON "player" (LOWER(TRIM("playerName")))`);
        await queryRunner.query(`
            CREATE VIEW "competition_address" AS
            SELECT      d."tournamentId" AS "tournamentId",
                        ph."divisionId"  AS "divisionId",
                        pg."phaseId"     AS "phaseId",
                        pg."id"          AS "phaseGroupId",
                        m."id"           AS "matchId"
            FROM        "phase_group" pg
            JOIN        "phase" ph ON ph."id" = pg."phaseId"
            JOIN        "division" d ON d."id" = ph."divisionId"
            LEFT JOIN   "match" m ON m."phaseGroupId" = pg."id"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW "competition_address"`);
        await queryRunner.query(`DROP INDEX "UQ_player_normalized_name"`);
        await queryRunner.query(`ALTER TABLE "match_entrants_entrant" DROP CONSTRAINT "FK_40a374a207499f6a7decdcf41d8"`);
        await queryRunner.query(`ALTER TABLE "match_entrants_entrant" DROP CONSTRAINT "FK_f229995fe721169a8a80a637df7"`);
        await queryRunner.query(`ALTER TABLE "entrant_participants_participant" DROP CONSTRAINT "FK_55d3161747bcc47846f889e6c8f"`);
        await queryRunner.query(`ALTER TABLE "entrant_participants_participant" DROP CONSTRAINT "FK_b50199abefb09e6fd40c324817d"`);
        await queryRunner.query(`ALTER TABLE "run_submission" DROP CONSTRAINT "FK_run_submission_tournament"`);
        await queryRunner.query(`ALTER TABLE "schedule" DROP CONSTRAINT "FK_schedule_tournament"`);
        await queryRunner.query(`ALTER TABLE "schedule" DROP CONSTRAINT "FK_schedule_current_entry"`);
        await queryRunner.query(`ALTER TABLE "schedule_entry" DROP CONSTRAINT "FK_schedule_entry_match"`);
        await queryRunner.query(`ALTER TABLE "schedule_entry" DROP CONSTRAINT "FK_schedule_entry_schedule"`);
        await queryRunner.query(`ALTER TABLE "division" DROP CONSTRAINT "FK_987d6d8e6edb01c1f371ef08456"`);
        await queryRunner.query(`ALTER TABLE "phase" DROP CONSTRAINT "FK_e7d5b67662d6357f3b6f5a8439a"`);
        await queryRunner.query(`ALTER TABLE "phase_group" DROP CONSTRAINT "FK_72ec86c141d930a9d55dc5d3f7b"`);
        await queryRunner.query(`ALTER TABLE "match" DROP CONSTRAINT "FK_14084794dd359f5338573d5fd23"`);
        await queryRunner.query(`ALTER TABLE "match" DROP CONSTRAINT "FK_418d16654c78f780aec5cc5f6e5"`);
        await queryRunner.query(`ALTER TABLE "match_tiebreak" DROP CONSTRAINT "FK_match_tiebreak_song"`);
        await queryRunner.query(`ALTER TABLE "match_tiebreak" DROP CONSTRAINT "FK_match_tiebreak_match"`);
        await queryRunner.query(`ALTER TABLE "match_tiebreak_standing" DROP CONSTRAINT "FK_match_tiebreak_standing_score"`);
        await queryRunner.query(`ALTER TABLE "match_tiebreak_standing" DROP CONSTRAINT "FK_match_tiebreak_standing_player"`);
        await queryRunner.query(`ALTER TABLE "match_tiebreak_standing" DROP CONSTRAINT "FK_match_tiebreak_standing_tiebreak"`);
        await queryRunner.query(`ALTER TABLE "round" DROP CONSTRAINT "FK_4bbb501900dff6ad36bcb818cd1"`);
        await queryRunner.query(`ALTER TABLE "round" DROP CONSTRAINT "FK_7f3ebe2c9b6582d68973dd1de22"`);
        await queryRunner.query(`ALTER TABLE "standing" DROP CONSTRAINT "FK_b6e4c4c42e9883cbdb8adcc4b93"`);
        await queryRunner.query(`ALTER TABLE "standing" DROP CONSTRAINT "FK_247c99355e4604a24fbe04b507d"`);
        await queryRunner.query(`ALTER TABLE "standing" DROP CONSTRAINT "FK_90f3771a995658f98fc55e07a8b"`);
        await queryRunner.query(`ALTER TABLE "score" DROP CONSTRAINT "FK_66f5fb8ee865712db248080d5ea"`);
        await queryRunner.query(`ALTER TABLE "score" DROP CONSTRAINT "FK_075dd3268b7d4953406d1329358"`);
        await queryRunner.query(`ALTER TABLE "song" DROP CONSTRAINT "FK_2d01b477ae344c1b2799b2ce3ba"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_e8e5c25554f3f5a3beff3f44371"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_93e11e907b1503ff0ce88b261f6"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_99cba5cb409eb7e657295b474ba"`);
        await queryRunner.query(`ALTER TABLE "entrant" DROP CONSTRAINT "FK_5f0fae8a9da1a6e3caf192956a9"`);
        await queryRunner.query(`ALTER TABLE "phase_group_entrant" DROP CONSTRAINT "FK_33bc939e21306276c3332d213a7"`);
        await queryRunner.query(`ALTER TABLE "phase_group_entrant" DROP CONSTRAINT "FK_7bef3689e57e31efe6e7999813a"`);
        await queryRunner.query(`ALTER TABLE "phase_group_entrant" DROP CONSTRAINT "FK_a828a232dd61e9c934e5d4e02af"`);
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_ece9bbff16e0733a1df91b1c16c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40a374a207499f6a7decdcf41d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f229995fe721169a8a80a637df"`);
        await queryRunner.query(`DROP TABLE "match_entrants_entrant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_55d3161747bcc47846f889e6c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b50199abefb09e6fd40c324817"`);
        await queryRunner.query(`DROP TABLE "entrant_participants_participant"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_run_submission_identity"`);
        await queryRunner.query(`DROP TABLE "run_submission"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_schedule_tournament"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_schedule_current_entry"`);
        await queryRunner.query(`DROP TABLE "schedule"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_schedule_entry_position"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_schedule_entry_match"`);
        await queryRunner.query(`DROP TABLE "schedule_entry"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_external_mapping_identity"`);
        await queryRunner.query(`DROP TABLE "external_mapping"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_division_tournament"`);
        await queryRunner.query(`DROP TABLE "division"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_phase_division"`);
        await queryRunner.query(`DROP TABLE "phase"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_phase_group_phase"`);
        await queryRunner.query(`DROP TABLE "phase_group"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_match_phase_group"`);
        await queryRunner.query(`DROP TABLE "match"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_match_tiebreak_sequence"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_match_tiebreak_song"`);
        await queryRunner.query(`DROP TABLE "match_tiebreak"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_match_tiebreak_standing_player"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_match_tiebreak_standing_player_lookup"`);
        await queryRunner.query(`DROP TABLE "match_tiebreak_standing"`);
        await queryRunner.query(`DROP TABLE "match_result"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dfa041d32ed2f7a150188a2da7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9df0a40a5d3842afc294a88e83"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_round_song"`);
        await queryRunner.query(`DROP TABLE "round"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_76a9cb5154ea8d65024989a39e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_standing_player"`);
        await queryRunner.query(`DROP TABLE "standing"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_score_song_player_id"`);
        await queryRunner.query(`DROP TABLE "score"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_song_tournament"`);
        await queryRunner.query(`DROP TABLE "song"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_tournament_control_room_key_hash"`);
        await queryRunner.query(`DROP TABLE "tournament"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_participant_tournament_player"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_participant_player"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_participant_account"`);
        await queryRunner.query(`DROP TABLE "participant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_entrant_division"`);
        await queryRunner.query(`DROP TABLE "entrant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_phase_group_entrant_phase_group"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_phase_group_entrant_entrant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_phase_group_entrant_source_advancement_rule"`);
        await queryRunner.query(`DROP TABLE "phase_group_entrant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_advancement_rule_source"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_advancement_rule_target"`);
        await queryRunner.query(`DROP TABLE "advancement_rule"`);
        await queryRunner.query(`DROP TABLE "account"`);
        await queryRunner.query(`DROP TABLE "player"`);
    }

}
