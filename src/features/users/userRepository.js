import bcrypt from "bcryptjs";

export class DuplicateUsernameError extends Error {
  constructor(message = "Username already exists.") {
    super(message);
    this.name = "DuplicateUsernameError";
  }
}

export class UserNotFoundError extends Error {
  constructor(message = "User account was not found.") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

export async function findUserByUsername(db, username) {
  const [rows] = await db.execute(
    `
      SELECT
        user_id,
        full_name,
        username,
        password_hash,
        role,
        account_status
      FROM users
      WHERE username = :username
        AND account_status = 'ACTIVE'
      LIMIT 1
    `,
    { username: String(username || "").trim().toLowerCase() }
  );

  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function createUser(db, user) {
  const username = String(user.username || "").trim().toLowerCase();
  const existing = await findAnyUserByUsername(db, username);

  if (existing) {
    throw new DuplicateUsernameError();
  }

  const passwordHash = await bcrypt.hash(user.password, 12);
  const [result] = await db.execute(
    `
      INSERT INTO users (full_name, username, password_hash, role, account_status)
      VALUES (:fullName, :username, :passwordHash, :role, 'ACTIVE')
    `,
    {
      fullName: user.fullName,
      username,
      passwordHash,
      role: user.role
    }
  );

  return {
    userId: Number(result.insertId),
    fullName: user.fullName,
    username,
    role: user.role
  };
}

export function buildUserListQuery() {
  return {
    sql: `
      SELECT
        user_id,
        full_name,
        username,
        role,
        account_status,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM users
      ORDER BY role ASC, full_name ASC, user_id ASC
    `,
    params: {}
  };
}

export async function listUsers(db) {
  const query = buildUserListQuery();
  const [rows] = await db.execute(query.sql, query.params);

  return rows.map(mapAccountUserRow);
}

export function buildUpdateUserStatusQuery(userId, accountStatus) {
  return {
    sql: `
      UPDATE users
      SET account_status = :accountStatus
      WHERE user_id = :userId
    `,
    params: {
      userId: Number(userId),
      accountStatus
    }
  };
}

export async function updateUserAccountStatus(db, userId, accountStatus) {
  const query = buildUpdateUserStatusQuery(userId, accountStatus);
  const [result] = await db.execute(query.sql, query.params);

  if (result.affectedRows === 0) {
    throw new UserNotFoundError();
  }
}

async function findAnyUserByUsername(db, username) {
  const [rows] = await db.execute(
    `
      SELECT user_id
      FROM users
      WHERE username = :username
      LIMIT 1
    `,
    { username }
  );

  return rows[0] || null;
}

function mapUserRow(row) {
  return {
    userId: Number(row.user_id),
    fullName: row.full_name,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    accountStatus: row.account_status
  };
}

export function mapAccountUserRow(row) {
  return {
    userId: Number(row.user_id),
    fullName: row.full_name,
    username: row.username,
    role: row.role,
    accountStatus: row.account_status,
    createdAt: formatDateTimeValue(row.created_at)
  };
}

function formatDateTimeValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }

  return String(value || "").slice(0, 19).replace("T", " ");
}
