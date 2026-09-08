-- Statement statistics for the local stack, so a scenario can be measured
-- against the database's own account of what it ran rather than against what
-- the application believes it asked for.
--
-- The extension needs "pg_stat_statements" in shared_preload_libraries, which
-- docker-compose.yml passes on the server command line. This file runs only
-- when the data volume is created, so a database that predates it gains the
-- extension from the dataset seeder, which issues the same statement.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
