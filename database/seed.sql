USE barangay_court_scheduler;

INSERT INTO users
  (user_id, full_name, contact_no, username, password_hash, role, account_status)
VALUES
  (1, 'System Administrator', NULL, 'admin', '$2a$12$FBkcAG7B68XP8st6u/98L.FbdrEHZLZN3VEeDJMl.LXs6iJjw6gg.', 'ADMIN', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  username = VALUES(username);

INSERT INTO reservation_statuses
  (status_id, status_code, status_name, is_blocking, display_order)
VALUES
  (1, 'AVAILABLE', 'Available', 0, 1),
  (2, 'RESERVED', 'Reserved', 1, 2),
  (3, 'MISSED', 'Missed', 0, 3),
  (4, 'CANCELLED', 'Cancelled', 0, 4),
  (5, 'COMPLETED', 'Completed', 0, 5)
ON DUPLICATE KEY UPDATE
  status_name = VALUES(status_name),
  is_blocking = VALUES(is_blocking),
  display_order = VALUES(display_order);

INSERT INTO time_slots
  (slot_id, name, start_time, end_time, display_order, is_active)
VALUES
  (1, '7:00 AM - 8:00 AM', '07:00:00', '08:00:00', 1, 1),
  (2, '8:00 AM - 9:00 AM', '08:00:00', '09:00:00', 2, 1),
  (3, '9:00 AM - 10:00 AM', '09:00:00', '10:00:00', 3, 1),
  (4, '10:00 AM - 11:00 AM', '10:00:00', '11:00:00', 4, 1),
  (5, '11:00 AM - 12:00 PM', '11:00:00', '12:00:00', 5, 1),
  (6, '12:00 PM - 1:00 PM', '12:00:00', '13:00:00', 6, 1),
  (7, '1:00 PM - 2:00 PM', '13:00:00', '14:00:00', 7, 1),
  (8, '2:00 PM - 3:00 PM', '14:00:00', '15:00:00', 8, 1),
  (9, '3:00 PM - 4:00 PM', '15:00:00', '16:00:00', 9, 1),
  (10, '4:00 PM - 5:00 PM', '16:00:00', '17:00:00', 10, 1),
  (11, '5:00 PM - 6:00 PM', '17:00:00', '18:00:00', 11, 1),
  (12, '6:00 PM - 7:00 PM', '18:00:00', '19:00:00', 12, 1),
  (13, '7:00 PM - 8:00 PM', '19:00:00', '20:00:00', 13, 1),
  (14, '8:00 PM - 9:00 PM', '20:00:00', '21:00:00', 14, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  display_order = VALUES(display_order),
  is_active = VALUES(is_active);

INSERT INTO court_settings
  (setting_key, setting_value, description)
VALUES
  ('barangay_name', 'Barangay Sto. Niño, Parañaque City', 'Official barangay name shown in the system.'),
  ('court_name', 'Barangay Basketball Court', 'Court name shown in schedules and reports.'),
  ('timezone', 'Asia/Manila', 'Local timezone for reservation dates and timestamps.'),
  ('opening_time', '07:00:00', 'Default daily opening time.'),
  ('closing_time', '21:00:00', 'Default daily closing time.'),
  ('min_reservation_minutes', '30', 'Minimum allowed reservation duration in minutes.'),
  ('max_reservation_minutes', '240', 'Maximum allowed reservation duration in minutes.'),
  ('allowed_days', '0,1,2,3,4,5,6', 'Allowed reservation days where 0 is Sunday.'),
  ('blocked_days', '', 'Blocked reservation dates as comma-separated YYYY-MM-DD values.'),
  ('missed_grace_minutes', '15', 'Grace period before marking a reservation missed.'),
  ('slot_minutes', '60', 'Default schedule slot size in minutes.'),
  ('backup_reminder_days', '7', 'Dashboard reminder threshold for successful database backups.')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  description = VALUES(description);
