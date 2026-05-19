export async function getBackupStatus(db, options = {}) {
  const today = options.today || currentManilaDate();
  const threshold = Number(options.reminderThresholdDays || await readBackupReminderThreshold(db));
  const [rows] = await db.execute(
    `
      SELECT DATE_FORMAT(MAX(created_at), '%Y-%m-%d %H:%i:%s') AS last_backup_at
      FROM activity_logs
      WHERE action = 'BACKUP_DATABASE'
    `
  );
  const lastBackupAt = rows[0]?.last_backup_at || null;
  const daysSinceBackup = lastBackupAt ? daysBetweenDates(lastBackupAt.slice(0, 10), today) : null;
  const reminderThresholdDays = Number.isInteger(threshold) && threshold > 0 ? threshold : 7;

  return {
    lastBackupAt,
    daysSinceBackup,
    reminderThresholdDays,
    backupDue: daysSinceBackup === null || daysSinceBackup >= reminderThresholdDays
  };
}

async function readBackupReminderThreshold(db) {
  const [rows] = await db.execute(
    `
      SELECT setting_value
      FROM court_settings
      WHERE setting_key = 'backup_reminder_days'
      LIMIT 1
    `
  );

  return Number(rows[0]?.setting_value || 7);
}

function daysBetweenDates(fromDate, toDate) {
  const from = parseUtcDate(fromDate);
  const to = parseUtcDate(toDate);

  if (!from || !to) {
    return null;
  }

  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
}

function parseUtcDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function currentManilaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}
