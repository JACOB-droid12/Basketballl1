-- SQL-only local MySQL setup runner.
-- This SOURCE-based file is kept as a convenience for MySQL-compatible
-- clients that support SOURCE commands from redirected input.
--
-- Oracle MySQL 9 does not execute SOURCE from redirected stdin. On Windows,
-- prefer the root setup-database-only.bat runner because it applies the same
-- three SQL files as separate local mysql commands.
--
-- If your mysql client supports SOURCE here, run this from the project root
-- so these relative paths resolve correctly.

SOURCE database/schema.sql;
SOURCE database/seed.sql;
SOURCE database/diagnostics.sql;
