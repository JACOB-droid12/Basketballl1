export class ReservationConflictError extends Error {
  constructor(message, overlap = null) {
    super(message);
    this.name = "ReservationConflictError";
    this.overlap = overlap;
  }
}

export class ReservationNotFoundError extends Error {
  constructor(message = "Reservation record was not found.") {
    super(message);
    this.name = "ReservationNotFoundError";
  }
}

export function buildReservationListQuery(filters = {}) {
  const where = [];
  const params = {};

  if (filters.reservationDate) {
    where.push("r.reservation_date = :reservationDate");
    params.reservationDate = filters.reservationDate;
  }

  if (filters.statusCode) {
    where.push("rs.status_code = :statusCode");
    params.statusCode = filters.statusCode;
  }

  if (filters.search) {
    where.push("(resident.full_name LIKE :searchLike OR resident.contact_no LIKE :searchLike)");
    params.searchLike = `%${filters.search}%`;
  }

  if (filters.purpose) {
    where.push("r.purpose LIKE :purposeLike");
    params.purposeLike = `%${filters.purpose}%`;
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  return {
    sql: `
      SELECT
        r.reservation_id,
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
      INNER JOIN residents resident
        ON resident.resident_id = r.resident_id
      INNER JOIN reservation_statuses rs
        ON rs.status_id = r.status_id
      INNER JOIN users creator
        ON creator.user_id = r.created_by_user_id
      ${whereSql}
      ORDER BY r.reservation_date DESC, r.start_time ASC, r.reservation_id DESC
    `,
    params
  };
}

export function buildReservationDetailQuery(reservationId) {
  return {
    sql: `
      SELECT
        r.reservation_id,
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
      INNER JOIN residents resident
        ON resident.resident_id = r.resident_id
      INNER JOIN reservation_statuses rs
        ON rs.status_id = r.status_id
      INNER JOIN users creator
        ON creator.user_id = r.created_by_user_id
      WHERE r.reservation_id = :reservationId
      LIMIT 1
    `,
    params: { reservationId: Number(reservationId) }
  };
}

export function buildReservationUpdateQuery(reservation) {
  return {
    sql: `
      UPDATE reservations
      SET
        resident_id = :residentId,
        status_id = :statusId,
        reservation_date = :reservationDate,
        start_time = :startTime,
        end_time = :endTime,
        purpose = :purpose,
        remarks = :remarks
      WHERE reservation_id = :reservationId
    `,
    params: {
      reservationId: Number(reservation.reservationId),
      residentId: Number(reservation.residentId),
      statusId: Number(reservation.statusId),
      reservationDate: reservation.reservationDate,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      purpose: reservation.purpose,
      remarks: reservation.remarks || null
    }
  };
}

export async function getReservationById(db, reservationId) {
  const query = buildReservationDetailQuery(reservationId);
  const [rows] = await db.execute(query.sql, query.params);

  return rows[0] ? mapReservationRow(rows[0]) : null;
}

export function buildReservationOverlapQuery(candidate) {
  const where = [
    "existing.reservation_date = :reservationDate",
    "existing_status.is_blocking = 1",
    ":startTime < existing.end_time",
    ":endTime > existing.start_time"
  ];

  const params = {
    reservationDate: candidate.reservationDate,
    startTime: candidate.startTime,
    endTime: candidate.endTime
  };

  if (candidate.reservationId) {
    where.push("existing.reservation_id <> :reservationId");
    params.reservationId = Number(candidate.reservationId);
  }

  return {
    sql: `
      SELECT
        existing.reservation_id,
        DATE_FORMAT(existing.reservation_date, '%Y-%m-%d') AS reservation_date,
        TIME_FORMAT(existing.start_time, '%H:%i:%s') AS start_time,
        TIME_FORMAT(existing.end_time, '%H:%i:%s') AS end_time,
        existing_status.status_code,
        resident.full_name AS resident_name
      FROM reservations existing
      INNER JOIN reservation_statuses existing_status
        ON existing_status.status_id = existing.status_id
      INNER JOIN residents resident
        ON resident.resident_id = existing.resident_id
      WHERE ${where.join(" AND ")}
      LIMIT 1
    `,
    params
  };
}

export function mapReservationRow(row) {
  return {
    reservationId: Number(row.reservation_id),
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

export async function listReservations(db, filters = {}) {
  const query = buildReservationListQuery(filters);
  const [rows] = await db.execute(query.sql, query.params);

  return rows.map(mapReservationRow);
}

export async function getTimeSlots(db) {
  const [rows] = await db.execute(`
    SELECT
      slot_id,
      name,
      TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
      TIME_FORMAT(end_time, '%H:%i:%s') AS end_time
    FROM time_slots
    WHERE is_active = 1
    ORDER BY display_order, start_time
  `);

  return rows.map((row) => ({
    slotId: Number(row.slot_id),
    name: row.name,
    startTime: formatTimeValue(row.start_time),
    endTime: formatTimeValue(row.end_time)
  }));
}

export async function getReservationStatuses(db) {
  const [rows] = await db.execute(`
    SELECT status_code, status_name
    FROM reservation_statuses
    WHERE status_code <> 'AVAILABLE'
    ORDER BY display_order
  `);

  return rows.map((row) => ({
    statusCode: row.status_code,
    statusName: row.status_name
  }));
}

export async function createReservation(db, reservation, options = {}) {
  const createdByUserId = Number(options.createdByUserId || process.env.DEFAULT_CREATED_BY_USER_ID || 1);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const overlap = await findOverlap(connection, reservation);
    if (overlap) {
      throw new ReservationConflictError("Reservation overlaps an existing active reservation.", mapReservationRow(overlap));
    }

    const residentId = await findOrCreateResident(connection, reservation);
    const statusId = await findStatusIdByCode(connection, reservation.statusCode);

    const [result] = await connection.execute(
      `
        INSERT INTO reservations
          (resident_id, status_id, approved_by_user_id, created_by_user_id, reservation_date, start_time, end_time, purpose, remarks)
        VALUES
          (:residentId, :statusId, :approvedByUserId, :createdByUserId, :reservationDate, :startTime, :endTime, :purpose, :remarks)
      `,
      {
        residentId,
        statusId,
        approvedByUserId: createdByUserId,
        createdByUserId,
        reservationDate: reservation.reservationDate,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        purpose: reservation.purpose,
        remarks: reservation.remarks || null
      }
    );

    await writeActivityLog(connection, {
      reservationId: result.insertId,
      userId: createdByUserId,
      action: "CREATE_RESERVATION",
      details: `Created reservation for ${reservation.representativeName} on ${reservation.reservationDate} ${reservation.startTime}-${reservation.endTime}.`
    });

    await connection.commit();
    return Number(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateReservation(db, reservationId, reservation, options = {}) {
  const userId = Number(options.userId || process.env.DEFAULT_CREATED_BY_USER_ID || 1);
  const connection = await db.getConnection();
  const numericReservationId = Number(reservationId);
  const candidate = { ...reservation, reservationId: numericReservationId };

  try {
    await connection.beginTransaction();
    const reservationExists = await reservationRowExists(connection, numericReservationId);

    if (!reservationExists) {
      throw new ReservationNotFoundError();
    }

    const overlap = await findOverlap(connection, candidate);
    if (overlap) {
      throw new ReservationConflictError("Reservation overlaps an existing active reservation.", mapReservationRow(overlap));
    }

    const residentId = await findOrCreateResident(connection, reservation);
    const statusId = await findStatusIdByCode(connection, reservation.statusCode);
    const query = buildReservationUpdateQuery({
      ...reservation,
      reservationId: numericReservationId,
      residentId,
      statusId
    });
    await connection.execute(query.sql, query.params);

    await writeActivityLog(connection, {
      reservationId: numericReservationId,
      userId,
      action: "UPDATE_RESERVATION",
      details: `Updated reservation for ${reservation.representativeName} on ${reservation.reservationDate} ${reservation.startTime}-${reservation.endTime}.`
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateReservationStatus(db, reservationId, statusCode, options = {}) {
  const userId = Number(options.userId || process.env.DEFAULT_CREATED_BY_USER_ID || 1);
  const connection = await db.getConnection();
  const numericReservationId = Number(reservationId);

  try {
    await connection.beginTransaction();
    const statusId = await findStatusIdByCode(connection, statusCode);
    const reservationExists = await reservationRowExists(connection, numericReservationId);

    if (!reservationExists) {
      throw new ReservationNotFoundError();
    }

    await connection.execute(
      `
        UPDATE reservations
        SET status_id = :statusId
        WHERE reservation_id = :reservationId
      `,
      { statusId, reservationId: numericReservationId }
    );

    await writeActivityLog(connection, {
      reservationId: numericReservationId,
      userId,
      action: `MARK_${String(statusCode).toUpperCase()}`,
      details: `Reservation status changed to ${String(statusCode).toUpperCase()}.`
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findOverlap(connection, reservation) {
  const query = buildReservationOverlapQuery(reservation);
  const [rows] = await connection.execute(query.sql, query.params);

  return rows[0] || null;
}

async function findOrCreateResident(connection, reservation) {
  const [existingRows] = await connection.execute(
    `
      SELECT resident_id
      FROM residents
      WHERE full_name = :fullName
        AND contact_no = :contactNo
        AND address = :address
      LIMIT 1
    `,
    {
      fullName: reservation.representativeName,
      contactNo: reservation.contactNo,
      address: reservation.address
    }
  );

  if (existingRows[0]) {
    return Number(existingRows[0].resident_id);
  }

  const [result] = await connection.execute(
    `
      INSERT INTO residents (full_name, contact_no, address)
      VALUES (:fullName, :contactNo, :address)
    `,
    {
      fullName: reservation.representativeName,
      contactNo: reservation.contactNo,
      address: reservation.address
    }
  );

  return Number(result.insertId);
}

async function findStatusIdByCode(connection, statusCode) {
  const [rows] = await connection.execute(
    `
      SELECT status_id
      FROM reservation_statuses
      WHERE status_code = :statusCode
      LIMIT 1
    `,
    { statusCode: String(statusCode || "").toUpperCase() }
  );

  if (!rows[0]) {
    throw new Error("Reservation status is invalid.");
  }

  return Number(rows[0].status_id);
}

async function reservationRowExists(connection, reservationId) {
  const [rows] = await connection.execute(
    `
      SELECT reservation_id
      FROM reservations
      WHERE reservation_id = :reservationId
      LIMIT 1
    `,
    { reservationId }
  );

  return Boolean(rows[0]);
}

async function writeActivityLog(connection, { reservationId, userId, action, details }) {
  await connection.execute(
    `
      INSERT INTO activity_logs (reservation_id, user_id, action, details)
      VALUES (:reservationId, :userId, :action, :details)
    `,
    { reservationId, userId, action, details }
  );
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
