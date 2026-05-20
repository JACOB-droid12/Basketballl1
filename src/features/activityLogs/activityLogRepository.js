export function buildActivityLogListQuery(filters = {}) {
  const where = [];
  const params = {};

  if (filters.action) {
    where.push("al.action = :action");
    params.action = filters.action;
  }

  if (filters.date) {
    where.push("DATE(al.created_at) = :date");
    params.date = filters.date;
  }

  if (filters.fromDate) {
    where.push("DATE(al.created_at) >= :fromDate");
    params.fromDate = filters.fromDate;
  }

  if (filters.toDate) {
    where.push("DATE(al.created_at) <= :toDate");
    params.toDate = filters.toDate;
  }

  if (filters.search) {
    where.push("(user.full_name LIKE :searchLike OR al.details LIKE :searchLike OR al.action LIKE :searchLike)");
    params.searchLike = `%${filters.search}%`;
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  return {
    sql: `
      SELECT
        al.log_id,
        al.action,
        al.details,
        DATE_FORMAT(al.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        user.full_name AS user_name,
        r.reservation_id,
        r.reference_no,
        DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservation_date,
        TIME_FORMAT(r.start_time, '%H:%i:%s') AS reservation_start_time,
        TIME_FORMAT(r.end_time, '%H:%i:%s') AS reservation_end_time
      FROM activity_logs al
      LEFT JOIN users user
        ON user.user_id = al.user_id
      LEFT JOIN reservations r
        ON r.reservation_id = al.reservation_id
      ${whereSql}
      ORDER BY al.created_at DESC, al.log_id DESC
      LIMIT 200
    `,
    params
  };
}

export async function listActivityLogs(db, filters = {}) {
  const query = buildActivityLogListQuery(filters);
  const [rows] = await db.execute(query.sql, query.params);

  return rows.map(mapActivityLogRow);
}

export function mapActivityLogRow(row) {
  const reservationId = row.reservation_id === null || row.reservation_id === undefined ? null : Number(row.reservation_id);

  return {
    logId: Number(row.log_id),
    action: row.action,
    details: row.details || "",
    createdAt: formatDateTimeValue(row.created_at),
    userName: row.user_name || "System",
    reservationId,
    referenceNo: row.reference_no || "",
    reservationDate: formatDateValue(row.reservation_date),
    reservationStartTime: formatTimeValue(row.reservation_start_time),
    reservationEndTime: formatTimeValue(row.reservation_end_time)
  };
}

function formatDateTimeValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }

  return String(value || "").slice(0, 19).replace("T", " ");
}

function formatDateValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value || "").slice(0, 10);
}

function formatTimeValue(value) {
  return String(value || "").slice(0, 5);
}
