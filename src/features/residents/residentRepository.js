export class DuplicateResidentError extends Error {
  constructor(message = "A resident or group with this contact number already exists.") {
    super(message);
    this.name = "DuplicateResidentError";
  }
}

export class ResidentNotFoundError extends Error {
  constructor(message = "Resident directory record was not found.") {
    super(message);
    this.name = "ResidentNotFoundError";
  }
}

export class ResidentInUseError extends Error {
  constructor(message = "This resident is referenced by one or more reservations and cannot be removed.") {
    super(message);
    this.name = "ResidentInUseError";
  }
}

export function buildResidentListQuery(filters = {}) {
  const where = [];
  const params = {};

  if (filters.search) {
    where.push("(full_name LIKE :searchLike OR contact_no LIKE :searchLike OR address LIKE :searchLike OR group_name LIKE :searchLike)");
    params.searchLike = `%${filters.search}%`;
  }

  if (filters.contactNumber) {
    where.push("contact_no = :contactNumber");
    params.contactNumber = filters.contactNumber;
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  return {
    sql: `
      SELECT
        resident_id,
        full_name,
        contact_no,
        address,
        group_name,
        notes,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
      FROM residents
      ${whereSql}
      ORDER BY updated_at DESC, full_name ASC
      LIMIT 100
    `,
    params
  };
}

export async function listResidents(db, filters = {}) {
  const query = buildResidentListQuery(filters);
  const [rows] = await db.execute(query.sql, query.params);

  return rows.map(mapResidentRow);
}

export async function createResidentDirectoryEntry(db, resident, options = {}) {
  const userId = requireAuthenticatedUserId(options.userId);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const duplicate = await findResidentByContactNumber(connection, resident.contactNumber);

    if (duplicate) {
      throw new DuplicateResidentError();
    }

    const [result] = await connection.execute(
      `
        INSERT INTO residents (full_name, contact_no, address, group_name, notes)
        VALUES (:name, :contactNumber, :address, :groupName, :notes)
      `,
      buildResidentParams(resident)
    );

    await writeActivityLog(connection, {
      userId,
      action: "CREATE_RESIDENT_DIRECTORY_ENTRY",
      details: `Created resident directory entry for ${resident.name}.`
    });

    const created = await getResidentById(connection, result.insertId);
    await connection.commit();
    return created;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateResidentDirectoryEntry(db, residentId, resident, options = {}) {
  const userId = requireAuthenticatedUserId(options.userId);
  const numericResidentId = Number(residentId);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const duplicate = await findResidentByContactNumber(connection, resident.contactNumber, numericResidentId);

    if (duplicate) {
      throw new DuplicateResidentError();
    }

    const [result] = await connection.execute(
      `
        UPDATE residents
        SET full_name = :name,
            contact_no = :contactNumber,
            address = :address,
            group_name = :groupName,
            notes = :notes
        WHERE resident_id = :residentId
      `,
      {
        ...buildResidentParams(resident),
        residentId: numericResidentId
      }
    );

    if (result.affectedRows === 0) {
      throw new ResidentNotFoundError();
    }

    await writeActivityLog(connection, {
      userId,
      action: "UPDATE_RESIDENT_DIRECTORY_ENTRY",
      details: `Updated resident directory entry for ${resident.name}.`
    });

    const updated = await getResidentById(connection, numericResidentId);
    await connection.commit();
    return updated;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteResidentDirectoryEntry(db, residentId, options = {}) {
  const userId = requireAuthenticatedUserId(options.userId);
  const numericResidentId = Number(residentId);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Read the resident first so the activity log can carry the name
    // (the row is gone after DELETE) and so a 404 surfaces consistently
    // for unknown ids.
    const existing = await getResidentById(connection, numericResidentId);
    if (!existing) {
      throw new ResidentNotFoundError();
    }

    try {
      const [result] = await connection.execute(
        "DELETE FROM residents WHERE resident_id = :residentId",
        { residentId: numericResidentId }
      );
      if (result.affectedRows === 0) {
        throw new ResidentNotFoundError();
      }
    } catch (error) {
      // The reservations.resident_id FK is `ON DELETE RESTRICT`. MySQL
      // surfaces the violation as ER_ROW_IS_REFERENCED_2 (errno 1451);
      // we translate it into the in-use sentinel so the route can
      // return a clean 409.
      if (error && (error.errno === 1451 || error.code === "ER_ROW_IS_REFERENCED_2")) {
        throw new ResidentInUseError();
      }
      throw error;
    }

    await writeActivityLog(connection, {
      userId,
      action: "DELETE_RESIDENT_DIRECTORY_ENTRY",
      details: `Deleted resident directory entry for ${existing.name}.`
    });

    await connection.commit();
    return existing;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function mapResidentRow(row) {
  return {
    residentId: Number(row.resident_id),
    name: row.full_name || "",
    contactNumber: row.contact_no || "",
    address: row.address || "",
    group: row.group_name || "",
    notes: row.notes || "",
    createdAt: formatDateTimeValue(row.created_at),
    updatedAt: formatDateTimeValue(row.updated_at)
  };
}

async function findResidentByContactNumber(connection, contactNumber, excludeResidentId = null) {
  const where = ["contact_no = :contactNumber"];
  const params = { contactNumber };

  if (excludeResidentId) {
    where.push("resident_id <> :excludeResidentId");
    params.excludeResidentId = Number(excludeResidentId);
  }

  const [rows] = await connection.execute(
    `
      SELECT resident_id
      FROM residents
      WHERE ${where.join(" AND ")}
      LIMIT 1
    `,
    params
  );

  return rows[0] || null;
}

async function getResidentById(connection, residentId) {
  const [rows] = await connection.execute(
    `
      SELECT
        resident_id,
        full_name,
        contact_no,
        address,
        group_name,
        notes,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
      FROM residents
      WHERE resident_id = :residentId
      LIMIT 1
    `,
    { residentId: Number(residentId) }
  );

  return rows[0] ? mapResidentRow(rows[0]) : null;
}

function buildResidentParams(resident) {
  return {
    name: resident.name,
    contactNumber: resident.contactNumber,
    address: resident.address,
    groupName: resident.group || null,
    notes: resident.notes || null
  };
}

async function writeActivityLog(connection, { userId, action, details }) {
  await connection.execute(
    `
      INSERT INTO activity_logs (user_id, action, details)
      VALUES (:userId, :action, :details)
    `,
    { userId, action, details }
  );
}

function formatDateTimeValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }

  return String(value || "").slice(0, 19).replace("T", " ");
}

function requireAuthenticatedUserId(userId) {
  const numericUserId = Number(userId);

  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new Error("Authenticated user ID is required.");
  }

  return numericUserId;
}
