USE barangay_court_scheduler;

SELECT
  'Database charset/collation' AS check_name,
  CASE
    WHEN DEFAULT_CHARACTER_SET_NAME = 'utf8mb4'
      AND DEFAULT_COLLATION_NAME = 'utf8mb4_unicode_ci'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  CONCAT(DEFAULT_CHARACTER_SET_NAME, ' / ', DEFAULT_COLLATION_NAME) AS details
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = DATABASE();

SELECT
  'Required tables exist' AS check_name,
  CASE WHEN COUNT(*) = 7 THEN 'PASS' ELSE 'FAIL' END AS result,
  CONCAT(COUNT(*), ' of 7 required tables found') AS details
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'users',
    'residents',
    'reservation_statuses',
    'time_slots',
    'court_settings',
    'reservations',
    'activity_logs'
  );

SELECT
  'Required tables use InnoDB and utf8mb4' AS check_name,
  CASE
    WHEN COUNT(*) = 7
      AND SUM(ENGINE = 'InnoDB') = 7
      AND SUM(TABLE_COLLATION = 'utf8mb4_unicode_ci') = 7
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  CONCAT(
    SUM(ENGINE = 'InnoDB'), ' InnoDB, ',
    SUM(TABLE_COLLATION = 'utf8mb4_unicode_ci'), ' utf8mb4 tables'
  ) AS details
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'users',
    'residents',
    'reservation_statuses',
    'time_slots',
    'court_settings',
    'reservations',
    'activity_logs'
  );

SELECT
  'Reservation foreign keys exist' AS check_name,
  CASE WHEN COUNT(DISTINCT CONSTRAINT_NAME) = 7 THEN 'PASS' ELSE 'FAIL' END AS result,
  CONCAT(COUNT(DISTINCT CONSTRAINT_NAME), ' of 7 reservation/log foreign keys found') AS details
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND CONSTRAINT_NAME IN (
    'fk_reservations_resident',
    'fk_reservations_time_slot',
    'fk_reservations_status',
    'fk_reservations_approved_by_user',
    'fk_reservations_created_by_user',
    'fk_activity_logs_reservation',
    'fk_activity_logs_user'
  );

SELECT
  'Overlap triggers exist' AS check_name,
  CASE WHEN COUNT(*) = 2 THEN 'PASS' ELSE 'FAIL' END AS result,
  CONCAT(COUNT(*), ' of 2 overlap triggers found') AS details
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND TRIGGER_NAME IN (
    'prevent_reservation_overlap_before_insert',
    'prevent_reservation_overlap_before_update'
  );

SELECT
  'Reservation statuses seeded' AS check_name,
  CASE
    WHEN COUNT(*) = 5
      AND SUM(status_code = 'RESERVED' AND is_blocking = 1) = 1
      AND SUM(status_code <> 'RESERVED' AND is_blocking = 0) = 4
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  GROUP_CONCAT(CONCAT(status_code, ':', is_blocking) ORDER BY display_order SEPARATOR ', ') AS details
FROM reservation_statuses
WHERE status_code IN ('AVAILABLE', 'RESERVED', 'MISSED', 'CANCELLED', 'COMPLETED');

SELECT
  'Default active time slots seeded' AS check_name,
  CASE
    WHEN COUNT(*) = 14
      AND MIN(start_time) = '07:00:00'
      AND MAX(end_time) = '21:00:00'
      AND SUM(end_time <= start_time) = 0
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  CONCAT(COUNT(*), ' active slots from ', MIN(start_time), ' to ', MAX(end_time)) AS details
FROM time_slots
WHERE is_active = 1;

SELECT
  'Starter admin password is hashed' AS check_name,
  CASE
    WHEN COUNT(*) = 1
      AND SUM(password_hash REGEXP '^\\$2[aby]\\$[0-9]{2}\\$') = 1
      AND SUM(password_hash LIKE '%admin123%') = 0
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  'admin account should use a bcrypt hash, not plaintext admin123' AS details
FROM users
WHERE username = 'admin';

SELECT
  'Court settings seeded' AS check_name,
  CASE WHEN COUNT(*) = 6 THEN 'PASS' ELSE 'FAIL' END AS result,
  GROUP_CONCAT(setting_key ORDER BY setting_key SEPARATOR ', ') AS details
FROM court_settings
WHERE setting_key IN (
  'barangay_name',
  'court_name',
  'timezone',
  'opening_time',
  'closing_time',
  'slot_minutes'
);
