export class ScheduleBlockConflictError extends Error {
  constructor(message = "Schedule block overlaps an existing unavailable court range.", overlap = null) {
    super(message);
    this.name = "ScheduleBlockConflictError";
    this.overlap = overlap;
  }
}

export class ScheduleBlockNotFoundError extends Error {
  constructor(message = "Schedule block was not found.") {
    super(message);
    this.name = "ScheduleBlockNotFoundError";
  }
}

export async function listScheduleBlocks(db, filters = {}) {
  const query = buildScheduleBlockListQuery(filters);
  const [rows] = await db.execute(query.sql, query.params);

  return rows.map(mapScheduleBlockRow);
}

export async function findActiveScheduleBlockOverlap(connection, candidate) {
  const [rows] = await connection.execute(
    `
      SELECT
        sb.block_id,
        sb.block_category,
        sb.block_type,
        sb.mode,
        DATE_FORMAT(sb.reservation_date, '%Y-%m-%d') AS reservation_date,
        TIME_FORMAT(sb.start_time, '%H:%i:%s') AS start_time,
        TIME_FORMAT(sb.end_time, '%H:%i:%s') AS end_time,
        sb.reason,
        sb.is_active,
        DATE_FORMAT(sb.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        creator.full_name AS created_by_name
      FROM schedule_blocks sb
      LEFT JOIN users creator
        ON creator.user_id = sb.created_by_user_id
      WHERE sb.is_active = 1
        AND sb.reservation_date = :reservationDate
        AND :startTime < sb.end_time
        AND :endTime > sb.start_time
      ORDER BY sb.start_time ASC, sb.block_id ASC
      LIMIT 1
    `,
    {
      reservationDate: candidate.reservationDate || candidate.date,
      startTime: candidate.startTime,
      endTime: candidate.endTime
    }
  );

  return rows[0] ? mapScheduleBlockRow(rows[0]) : null;
}

export async function createScheduleBlock(db, payload, options = {}) {
  const userId = requireAuthenticatedUserId(options.userId);
  const connection = await db.getConnection();
  let lockName = "";

  try {
    await connection.beginTransaction();
    lockName = await acquireScheduleDateLock(connection, payload.date);
    const overlap = await findActiveScheduleBlockOverlap(connection, {
      reservationDate: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime
    });

    if (overlap) {
      throw new ScheduleBlockConflictError("Schedule block overlaps an existing unavailable court range.", overlap);
    }

    const [result] = await connection.execute(
      `
        INSERT INTO schedule_blocks
          (block_category, block_type, mode, reservation_date, start_time, end_time, reason, created_by_user_id, is_active)
        VALUES
          (:category, :type, :mode, :date, :startTime, :endTime, :reason, :createdByUserId, 1)
      `,
      {
        category: payload.category,
        type: payload.type,
        mode: payload.mode,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        reason: payload.reason,
        createdByUserId: userId
      }
    );

    await writeActivityLog(connection, {
      userId,
      action: "CREATE_SCHEDULE_BLOCK",
      details: `Created ${payload.category} block ${payload.date} ${payload.startTime}-${payload.endTime}: ${payload.reason}.`
    });

    const block = await getScheduleBlockById(connection, result.insertId);
    await connection.commit();
    return block;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await releaseScheduleDateLock(connection, lockName);
    connection.release();
  }
}

export async function deactivateScheduleBlock(db, blockId, options = {}) {
  const userId = requireAuthenticatedUserId(options.userId);
  const connection = await db.getConnection();
  const numericBlockId = Number(blockId);

  try {
    await connection.beginTransaction();
    const existing = await getScheduleBlockById(connection, numericBlockId);

    if (!existing || existing.isActive === false) {
      throw new ScheduleBlockNotFoundError();
    }

    await connection.execute(
      `
        UPDATE schedule_blocks
        SET is_active = 0,
            deactivated_by_user_id = :userId,
            deactivated_at = CURRENT_TIMESTAMP
        WHERE block_id = :blockId
      `,
      { blockId: numericBlockId, userId }
    );

    await writeActivityLog(connection, {
      userId,
      action: "DEACTIVATE_SCHEDULE_BLOCK",
      details: `Deactivated ${existing.category} block ${existing.date} ${existing.startTime}-${existing.endTime}: ${existing.reason}.`
    });

    await connection.commit();
    return { ...existing, isActive: false };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function clearPublicUseRange(db, payload, options = {}) {
  const userId = requireAuthenticatedUserId(options.userId);
  const connection = await db.getConnection();
  let lockName = "";

  try {
    await connection.beginTransaction();
    lockName = await acquireScheduleDateLock(connection, payload.date);
    const overlap = await findActiveScheduleBlockOverlap(connection, {
      reservationDate: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime
    });

    if (overlap) {
      throw new ScheduleBlockConflictError("Clear public-use range overlaps an existing unavailable court range.", overlap);
    }

    const cancelledReservations = await listOverlappingReservedReservations(connection, payload);
    const cancelledStatusId = await findStatusIdByCode(connection, "CANCELLED");

    if (cancelledReservations.length > 0) {
      await cancelReservationsById(connection, cancelledReservations.map((reservation) => reservation.reservationId), cancelledStatusId);
    }

    const [result] = await connection.execute(
      `
        INSERT INTO schedule_blocks
          (block_category, block_type, mode, reservation_date, start_time, end_time, reason, created_by_user_id, is_active)
        VALUES
          ('PUBLIC_USE', 'CLEARED_PUBLIC_USE', :mode, :date, :startTime, :endTime, :reason, :createdByUserId, 1)
      `,
      {
        mode: payload.mode,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        reason: payload.reason,
        createdByUserId: userId
      }
    );

    await writeActivityLog(connection, {
      userId,
      action: "CLEAR_PUBLIC_USE",
      details: `Cleared ${payload.date} ${payload.startTime}-${payload.endTime} for public use. Cancelled ${cancelledReservations.length} reservation(s).`
    });

    for (const reservation of cancelledReservations) {
      await writeActivityLog(connection, {
        reservationId: reservation.reservationId,
        userId,
        action: "CANCEL_FOR_PUBLIC_USE",
        details: `Cancelled ${reservation.referenceNo || `reservation ${reservation.reservationId}`} because ${payload.date} ${payload.startTime}-${payload.endTime} was cleared for public use.`
      });
    }

    const block = await getScheduleBlockById(connection, result.insertId);
    await connection.commit();
    return {
      block,
      cancelledReservations: cancelledReservations.map((reservation) => ({
        ...reservation,
        statusCode: "CANCELLED",
        statusName: "Cancelled"
      }))
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await releaseScheduleDateLock(connection, lockName);
    connection.release();
  }
}

export function buildScheduleBlockListQuery(filters = {}) {
  const where = [];
  const params = {};

  if (filters.date) {
    where.push("sb.reservation_date = :date");
    params.date = filters.date;
  }

  if (filters.fromDate) {
    where.push("sb.reservation_date >= :fromDate");
    params.fromDate = filters.fromDate;
  }

  if (filters.toDate) {
    where.push("sb.reservation_date <= :toDate");
    params.toDate = filters.toDate;
  }

  if (filters.category) {
    where.push("sb.block_category = :category");
    params.category = filters.category;
  }

  if (filters.activeOnly !== false) {
    where.push("sb.is_active = 1");
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  return {
    sql: `
      SELECT
        sb.block_id,
        sb.block_category,
        sb.block_type,
        sb.mode,
        DATE_FORMAT(sb.reservation_date, '%Y-%m-%d') AS reservation_date,
        TIME_FORMAT(sb.start_time, '%H:%i:%s') AS start_time,
        TIME_FORMAT(sb.end_time, '%H:%i:%s') AS end_time,
        sb.reason,
        sb.is_active,
        DATE_FORMAT(sb.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        creator.full_name AS created_by_name
      FROM schedule_blocks sb
      LEFT JOIN users creator
        ON creator.user_id = sb.created_by_user_id
      ${whereSql}
      ORDER BY sb.reservation_date ASC, sb.start_time ASC, sb.block_id ASC
    `,
    params
  };
}

export function mapScheduleBlockRow(row) {
  const category = row.block_category || row.category || "";
  const type = row.block_type || row.type || "";

  return {
    blockId: Number(row.block_id ?? row.blockId),
    category,
    type,
    mode: row.mode || "TIME_RANGE",
    date: formatDateValue(row.reservation_date ?? row.date),
    startTime: formatTimeValue(row.start_time ?? row.startTime),
    endTime: formatTimeValue(row.end_time ?? row.endTime),
    reason: row.reason || "",
    isActive: row.is_active === undefined ? row.isActive !== false : Number(row.is_active) === 1,
    createdAt: formatDateTimeValue(row.created_at ?? row.createdAt),
    createdByName: row.created_by_name || row.createdByName || "",
    statusCode: statusCodeForBlock(category, type)
  };
}

async function getScheduleBlockById(connection, blockId) {
  const [rows] = await connection.execute(
    `
      SELECT
        sb.block_id,
        sb.block_category,
        sb.block_type,
        sb.mode,
        DATE_FORMAT(sb.reservation_date, '%Y-%m-%d') AS reservation_date,
        TIME_FORMAT(sb.start_time, '%H:%i:%s') AS start_time,
        TIME_FORMAT(sb.end_time, '%H:%i:%s') AS end_time,
        sb.reason,
        sb.is_active,
        DATE_FORMAT(sb.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        creator.full_name AS created_by_name
      FROM schedule_blocks sb
      LEFT JOIN users creator
        ON creator.user_id = sb.created_by_user_id
      WHERE sb.block_id = :blockId
      LIMIT 1
    `,
    { blockId: Number(blockId) }
  );

  return rows[0] ? mapScheduleBlockRow(rows[0]) : null;
}

async function listOverlappingReservedReservations(connection, payload) {
  const [rows] = await connection.execute(
    `
      SELECT
        r.reservation_id,
        r.reference_no,
        DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservation_date,
        TIME_FORMAT(r.start_time, '%H:%i:%s') AS start_time,
        TIME_FORMAT(r.end_time, '%H:%i:%s') AS end_time,
        r.purpose,
        r.remarks,
        rs.status_code,
        rs.status_name,
        resident.full_name AS resident_name,
        resident.contact_no,
        resident.address,
        creator.full_name AS created_by_name
      FROM reservations r
      INNER JOIN reservation_statuses rs
        ON rs.status_id = r.status_id
      INNER JOIN residents resident
        ON resident.resident_id = r.resident_id
      INNER JOIN users creator
        ON creator.user_id = r.created_by_user_id
      WHERE r.reservation_date = :date
        AND rs.status_code = 'RESERVED'
        AND :startTime < r.end_time
        AND :endTime > r.start_time
      ORDER BY r.start_time ASC, r.reservation_id ASC
    `,
    {
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime
    }
  );

  return rows.map(mapReservationRow);
}

async function findStatusIdByCode(connection, statusCode) {
  const [rows] = await connection.execute(
    `
      SELECT status_id
      FROM reservation_statuses
      WHERE status_code = :statusCode
      LIMIT 1
    `,
    { statusCode }
  );

  if (!rows[0]) {
    throw new Error("Reservation status is invalid.");
  }

  return Number(rows[0].status_id);
}

async function cancelReservationsById(connection, reservationIds, statusId) {
  const placeholders = reservationIds.map((_reservationId, index) => `:reservationId${index}`);
  const params = Object.fromEntries(reservationIds.map((reservationId, index) => [`reservationId${index}`, reservationId]));

  await connection.execute(
    `
      UPDATE reservations
      SET status_id = :statusId
      WHERE reservation_id IN (${placeholders.join(", ")})
    `,
    {
      ...params,
      statusId
    }
  );
}

async function writeActivityLog(connection, { reservationId = null, userId, action, details }) {
  await connection.execute(
    `
      INSERT INTO activity_logs (reservation_id, user_id, action, details)
      VALUES (:reservationId, :userId, :action, :details)
    `,
    { reservationId, userId, action, details }
  );
}

async function acquireScheduleDateLock(connection, date) {
  const lockName = buildScheduleDateLockName(date);
  const [[row]] = await connection.execute(
    "SELECT GET_LOCK(:lockName, 10) AS lock_result",
    { lockName }
  );

  if (Number(row?.lock_result) !== 1) {
    throw new Error("The court schedule is busy. Please try again.");
  }

  return lockName;
}

async function releaseScheduleDateLock(connection, lockName) {
  if (!lockName) {
    return;
  }

  await connection.execute(
    "SELECT RELEASE_LOCK(:lockName) AS release_result",
    { lockName }
  ).catch(() => {});
}

function buildScheduleDateLockName(date) {
  const safeDate = String(date || "").replace(/[^0-9-]/g, "").slice(0, 10);

  return `barangay_schedule_block_${safeDate || "unknown"}`;
}

function requireAuthenticatedUserId(value) {
  const userId = Number(value);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Authenticated user ID is required for schedule block mutations.");
  }

  return userId;
}

function mapReservationRow(row) {
  return {
    reservationId: Number(row.reservation_id),
    referenceNo: row.reference_no || "",
    reservationDate: formatDateValue(row.reservation_date),
    startTime: formatTimeValue(row.start_time),
    endTime: formatTimeValue(row.end_time),
    purpose: row.purpose || "",
    remarks: row.remarks || "",
    statusCode: row.status_code,
    statusName: row.status_name,
    representativeName: row.resident_name,
    contactNo: row.contact_no,
    address: row.address,
    createdByName: row.created_by_name || ""
  };
}

export function statusCodeForBlock(category, type) {
  if (String(category).toUpperCase() === "PUBLIC_USE") {
    return "CLEARED_PUBLIC_USE";
  }

  if (String(type).toUpperCase() === "BARANGAY_EVENT") {
    return "BARANGAY_EVENT";
  }

  return "MAINTENANCE";
}

function formatDateValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value || "").slice(0, 10);
}

function formatDateTimeValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }

  return String(value || "").slice(0, 19).replace("T", " ");
}

function formatTimeValue(value) {
  return String(value || "").slice(0, 5);
}
