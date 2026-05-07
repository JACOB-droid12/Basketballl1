import bcrypt from "bcryptjs";

export class DuplicateUsernameError extends Error {
  constructor(message = "Username already exists.") {
    super(message);
    this.name = "DuplicateUsernameError";
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
