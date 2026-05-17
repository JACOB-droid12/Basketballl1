CREATE DATABASE IF NOT EXISTS barangay_court_scheduler
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

ALTER DATABASE barangay_court_scheduler
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE barangay_court_scheduler;

CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  contact_no VARCHAR(30) NULL,
  username VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_username (username),
  CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'STAFF')),
  CONSTRAINT chk_users_account_status CHECK (account_status IN ('ACTIVE', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS residents (
  resident_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(140) NOT NULL,
  contact_no VARCHAR(30) NOT NULL,
  address VARCHAR(255) NOT NULL,
  group_name VARCHAR(140) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (resident_id),
  KEY idx_residents_full_name (full_name),
  KEY idx_residents_contact_no (contact_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservation_statuses (
  status_id SMALLINT UNSIGNED NOT NULL,
  status_code VARCHAR(30) NOT NULL,
  status_name VARCHAR(50) NOT NULL,
  is_blocking TINYINT(1) NOT NULL DEFAULT 0,
  display_order SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (status_id),
  UNIQUE KEY uq_reservation_statuses_code (status_code),
  CONSTRAINT chk_reservation_statuses_blocking CHECK (is_blocking IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS time_slots (
  slot_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (slot_id),
  UNIQUE KEY uq_time_slots_time_range (start_time, end_time),
  CONSTRAINT chk_time_slots_time_order CHECK (end_time > start_time),
  CONSTRAINT chk_time_slots_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS court_settings (
  setting_key VARCHAR(80) NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservation_reference_sequences (
  reference_year SMALLINT UNSIGNED NOT NULL,
  next_sequence BIGINT UNSIGNED NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (reference_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservations (
  reservation_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_no VARCHAR(20) NOT NULL,
  resident_id BIGINT UNSIGNED NOT NULL,
  time_slot_id SMALLINT UNSIGNED NULL,
  status_id SMALLINT UNSIGNED NOT NULL,
  approved_by_user_id BIGINT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose VARCHAR(120) NOT NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (reservation_id),
  UNIQUE KEY uq_reservations_reference_no (reference_no),
  KEY idx_reservations_date_time (reservation_date, start_time, end_time),
  KEY idx_reservations_status_date (status_id, reservation_date),
  KEY idx_reservations_resident (resident_id),
  KEY idx_reservations_created_by (created_by_user_id),
  CONSTRAINT fk_reservations_resident
    FOREIGN KEY (resident_id) REFERENCES residents (resident_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_reservations_time_slot
    FOREIGN KEY (time_slot_id) REFERENCES time_slots (slot_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_reservations_status
    FOREIGN KEY (status_id) REFERENCES reservation_statuses (status_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_reservations_approved_by_user
    FOREIGN KEY (approved_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_reservations_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_reservations_time_order CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_blocks (
  block_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  block_category VARCHAR(30) NOT NULL,
  block_type VARCHAR(40) NOT NULL,
  mode VARCHAR(30) NOT NULL DEFAULT 'TIME_RANGE',
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  deactivated_by_user_id BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP NULL,
  PRIMARY KEY (block_id),
  KEY idx_schedule_blocks_date_time (reservation_date, start_time, end_time),
  KEY idx_schedule_blocks_active_date (is_active, reservation_date),
  KEY idx_schedule_blocks_created_by (created_by_user_id),
  CONSTRAINT fk_schedule_blocks_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_schedule_blocks_deactivated_by_user
    FOREIGN KEY (deactivated_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_schedule_blocks_category CHECK (block_category IN ('MAINTENANCE', 'PUBLIC_USE')),
  CONSTRAINT chk_schedule_blocks_mode CHECK (mode IN ('WHOLE_DAY', 'TIME_RANGE', 'FROM_TIME_ONWARD')),
  CONSTRAINT chk_schedule_blocks_active CHECK (is_active IN (0, 1)),
  CONSTRAINT chk_schedule_blocks_time_order CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  details TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  KEY idx_activity_logs_created_at (created_at),
  KEY idx_activity_logs_reservation (reservation_id),
  KEY idx_activity_logs_user (user_id),
  CONSTRAINT fk_activity_logs_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations (reservation_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE residents CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE reservation_statuses CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE time_slots CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE court_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE reservation_reference_sequences CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE reservations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE schedule_blocks CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE activity_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS group_name VARCHAR(140) NULL AFTER address,
  ADD COLUMN IF NOT EXISTS notes TEXT NULL AFTER group_name;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reference_no VARCHAR(20) NULL AFTER reservation_id;

UPDATE reservations r
INNER JOIN (
  SELECT
    reservation_id,
    CONCAT('BCS-', reference_year, '-', LPAD(sequence_number, 6, '0')) AS generated_reference_no
  FROM (
    SELECT
      reservation_id,
      YEAR(reservation_date) AS reference_year,
      ROW_NUMBER() OVER (
        PARTITION BY YEAR(reservation_date)
        ORDER BY reservation_date, start_time, reservation_id
      ) AS sequence_number
    FROM reservations
    WHERE reference_no IS NULL OR reference_no = ''
  ) ranked_reservations
) generated
  ON generated.reservation_id = r.reservation_id
SET r.reference_no = generated.generated_reference_no
WHERE r.reference_no IS NULL OR r.reference_no = '';

ALTER TABLE reservations
  MODIFY reference_no VARCHAR(20) NOT NULL;

ALTER TABLE reservations
  ADD UNIQUE KEY IF NOT EXISTS uq_reservations_reference_no (reference_no);

INSERT INTO reservation_reference_sequences (reference_year, next_sequence)
SELECT
  YEAR(reservation_date) AS reference_year,
  COALESCE(MAX(CAST(SUBSTRING(reference_no, 10) AS UNSIGNED)), 0) + 1 AS next_sequence
FROM reservations
GROUP BY YEAR(reservation_date)
ON DUPLICATE KEY UPDATE
  next_sequence = GREATEST(next_sequence, VALUES(next_sequence));

DROP TRIGGER IF EXISTS prevent_reservation_overlap_before_insert;
DROP TRIGGER IF EXISTS prevent_reservation_overlap_before_update;

DELIMITER //

CREATE TRIGGER prevent_reservation_overlap_before_insert
BEFORE INSERT ON reservations
FOR EACH ROW
BEGIN
  DECLARE new_status_blocks TINYINT DEFAULT 0;
  DECLARE overlapping_reservations INT DEFAULT 0;

  SELECT COALESCE(is_blocking, 0)
    INTO new_status_blocks
    FROM reservation_statuses
    WHERE status_id = NEW.status_id
    LIMIT 1;

  IF NEW.end_time <= NEW.start_time THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Reservation end time must be after start time.';
  END IF;

  IF new_status_blocks = 1 THEN
    SELECT COUNT(*)
      INTO overlapping_reservations
      FROM reservations existing
      INNER JOIN reservation_statuses existing_status
        ON existing_status.status_id = existing.status_id
      WHERE existing.reservation_date = NEW.reservation_date
        AND existing_status.is_blocking = 1
        AND NEW.start_time < existing.end_time
        AND NEW.end_time > existing.start_time;

    IF overlapping_reservations > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Reservation overlaps an existing active reservation.';
    END IF;
  END IF;
END//

CREATE TRIGGER prevent_reservation_overlap_before_update
BEFORE UPDATE ON reservations
FOR EACH ROW
BEGIN
  DECLARE new_status_blocks TINYINT DEFAULT 0;
  DECLARE overlapping_reservations INT DEFAULT 0;

  SELECT COALESCE(is_blocking, 0)
    INTO new_status_blocks
    FROM reservation_statuses
    WHERE status_id = NEW.status_id
    LIMIT 1;

  IF NEW.end_time <= NEW.start_time THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Reservation end time must be after start time.';
  END IF;

  IF new_status_blocks = 1 THEN
    SELECT COUNT(*)
      INTO overlapping_reservations
      FROM reservations existing
      INNER JOIN reservation_statuses existing_status
        ON existing_status.status_id = existing.status_id
      WHERE existing.reservation_id <> NEW.reservation_id
        AND existing.reservation_date = NEW.reservation_date
        AND existing_status.is_blocking = 1
        AND NEW.start_time < existing.end_time
        AND NEW.end_time > existing.start_time;

    IF overlapping_reservations > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Reservation overlaps an existing active reservation.';
    END IF;
  END IF;
END//

DELIMITER ;
