import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeSqlFiles,
  formatSqlStaticReport
} from "../scripts/verify-sql-static.mjs";

const VALID_SCHEMA = `
CREATE DATABASE IF NOT EXISTS barangay_court_scheduler
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
ALTER DATABASE barangay_court_scheduler
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE barangay_court_scheduler;
CREATE TABLE IF NOT EXISTS users (user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, PRIMARY KEY (user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS residents (resident_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, PRIMARY KEY (resident_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS reservation_statuses (status_id SMALLINT UNSIGNED NOT NULL, PRIMARY KEY (status_id), UNIQUE KEY uq_reservation_statuses_code (status_code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS time_slots (slot_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT, start_time TIME NOT NULL, end_time TIME NOT NULL, PRIMARY KEY (slot_id), UNIQUE KEY uq_time_slots_time_range (start_time, end_time), CONSTRAINT chk_time_slots_time_order CHECK (end_time > start_time)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS court_settings (setting_key VARCHAR(80) NOT NULL, PRIMARY KEY (setting_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS reservations (
  reservation_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resident_id BIGINT UNSIGNED NOT NULL,
  time_slot_id SMALLINT UNSIGNED NULL,
  status_id SMALLINT UNSIGNED NOT NULL,
  approved_by_user_id BIGINT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (reservation_id),
  CONSTRAINT fk_reservations_resident FOREIGN KEY (resident_id) REFERENCES residents (resident_id),
  CONSTRAINT fk_reservations_time_slot FOREIGN KEY (time_slot_id) REFERENCES time_slots (slot_id),
  CONSTRAINT fk_reservations_status FOREIGN KEY (status_id) REFERENCES reservation_statuses (status_id),
  CONSTRAINT fk_reservations_approved_by_user FOREIGN KEY (approved_by_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_reservations_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users (user_id),
  CONSTRAINT chk_reservations_time_order CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS activity_logs (
  log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (log_id),
  CONSTRAINT fk_activity_logs_reservation FOREIGN KEY (reservation_id) REFERENCES reservations (reservation_id),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE residents CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE reservation_statuses CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE time_slots CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE court_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE reservations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE activity_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DROP TRIGGER IF EXISTS prevent_reservation_overlap_before_insert;
DROP TRIGGER IF EXISTS prevent_reservation_overlap_before_update;
CREATE TRIGGER prevent_reservation_overlap_before_insert BEFORE INSERT ON reservations FOR EACH ROW BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation overlaps an existing active reservation.'; END;
CREATE TRIGGER prevent_reservation_overlap_before_update BEFORE UPDATE ON reservations FOR EACH ROW BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation overlaps an existing active reservation.'; END;
`;

const VALID_SEED = `
INSERT INTO reservation_statuses (status_id, status_code, status_name, is_blocking, display_order)
VALUES (1, 'AVAILABLE', 'Available', 0, 1), (2, 'RESERVED', 'Reserved', 1, 2), (3, 'MISSED', 'Missed', 0, 3), (4, 'CANCELLED', 'Cancelled', 0, 4), (5, 'COMPLETED', 'Completed', 0, 5)
ON DUPLICATE KEY UPDATE status_name = VALUES(status_name);
INSERT INTO time_slots (slot_id, name, start_time, end_time, display_order, is_active)
VALUES (1, '7:00 AM - 8:00 AM', '07:00:00', '08:00:00', 1, 1), (14, '8:00 PM - 9:00 PM', '20:00:00', '21:00:00', 14, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);
INSERT INTO users (user_id, full_name, username, password_hash, role, account_status)
VALUES (1, 'System Administrator', 'admin', '$2a$12$hash', 'ADMIN', 'ACTIVE')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);
INSERT INTO court_settings (setting_key, setting_value) VALUES ('timezone', 'Asia/Manila')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
`;

const VALID_DIAGNOSTICS = `
USE barangay_court_scheduler;
SELECT * FROM information_schema.SCHEMATA;
SELECT * FROM information_schema.TABLES;
SELECT * FROM information_schema.REFERENTIAL_CONSTRAINTS;
SELECT * FROM information_schema.TRIGGERS;
SELECT * FROM reservation_statuses;
SELECT * FROM time_slots;
SELECT password_hash FROM users;
SELECT * FROM court_settings;
`;

const VALID_SETUP = `
SOURCE database/schema.sql;
SOURCE database/seed.sql;
SOURCE database/diagnostics.sql;
`;

const VALID_DATABASE_ONLY_SETUP = `
mysql -h"%MYSQL_HOST%" -P"%MYSQL_PORT%" -u"%MYSQL_USER%" < database\\schema.sql
mysql -h"%MYSQL_HOST%" -P"%MYSQL_PORT%" -u"%MYSQL_USER%" "%MYSQL_DATABASE%" < database\\seed.sql
mysql -h"%MYSQL_HOST%" -P"%MYSQL_PORT%" -u"%MYSQL_USER%" "%MYSQL_DATABASE%" < database\\diagnostics.sql
`;

test("passes SQL static checks for required schema and seed artifacts", () => {
  const report = analyzeSqlFiles({
    schemaSql: VALID_SCHEMA,
    seedSql: VALID_SEED,
    diagnosticsSql: VALID_DIAGNOSTICS,
    setupSql: VALID_SETUP,
    databaseOnlySetupScript: VALID_DATABASE_ONLY_SETUP
  });

  assert.equal(report.ok, true);
  assert.equal(report.checks.every((check) => check.ok), true);
});

test("reports missing SQL safety and setup requirements", () => {
  const report = analyzeSqlFiles({
    schemaSql: "CREATE DATABASE IF NOT EXISTS barangay_court_scheduler; CREATE TABLE IF NOT EXISTS users (id INT) ENGINE=InnoDB;",
    seedSql: "INSERT INTO users (username, password_hash) VALUES ('admin', 'admin123');",
    diagnosticsSql: "DELETE FROM users;",
    setupSql: "SOURCE database/schema.sql; DROP DATABASE barangay_court_scheduler;",
    databaseOnlySetupScript: ""
  });
  const formatted = formatSqlStaticReport(report);

  assert.equal(report.ok, false);
  assert.match(formatted, /\[FAIL\] database charset enforcement/);
  assert.match(formatted, /\[FAIL\] table charset enforcement/);
  assert.match(formatted, /\[FAIL\] existing-table charset conversion/);
  assert.match(formatted, /\[FAIL\] trigger rerun safety/);
  assert.match(formatted, /\[FAIL\] seed idempotency/);
  assert.match(formatted, /\[FAIL\] overlap triggers/);
  assert.match(formatted, /\[FAIL\] seed password safety/);
  assert.match(formatted, /\[FAIL\] diagnostics script coverage/);
  assert.match(formatted, /\[FAIL\] diagnostics script read-only/);
  assert.match(formatted, /\[FAIL\] sql-only setup runner/);
});
