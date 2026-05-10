import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRuntimeDatabaseReady,
  buildRuntimeDatabaseConfig,
  checkRuntimeDatabase
} from "../scripts/check-runtime-database.mjs";

test("builds runtime database config from local environment values", () => {
  const config = buildRuntimeDatabaseConfig({
    DB_HOST: "127.0.0.1",
    DB_PORT: "3307",
    DB_USER: "barangay_user",
    DB_PASSWORD: "local-secret",
    DB_NAME: "barangay_office"
  });

  assert.deepEqual(config, {
    host: "127.0.0.1",
    port: 3307,
    user: "barangay_user",
    password: "local-secret",
    database: "barangay_office"
  });
});

test("runtime database readiness checks required seeded tables and an active admin without writing data", async () => {
  const calls = [];
  const connection = {
    execute: async (sql) => {
      calls.push(sql.replace(/\s+/g, " ").trim());

      if (sql.includes("reservation_statuses")) return [[{ count_value: 5 }]];
      if (sql.includes("time_slots")) return [[{ count_value: 14 }]];
      if (sql.includes("FROM users")) return [[{ count_value: 1 }]];
      return [[{ ok: 1 }]];
    }
  };

  await assertRuntimeDatabaseReady(connection);

  assert.ok(calls.some((sql) => sql.includes("SELECT 1 AS ok")));
  assert.ok(calls.some((sql) => sql.includes("FROM reservation_statuses")));
  assert.ok(calls.some((sql) => sql.includes("FROM time_slots")));
  assert.ok(calls.some((sql) => sql.includes("FROM users") && !sql.includes("username = 'admin'")));
  assert.equal(calls.some((sql) => /\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(sql)), false);
});

test("runtime database readiness accepts a retired starter admin when another admin is active", async () => {
  const connection = {
    execute: async (sql) => {
      if (sql.includes("reservation_statuses")) return [[{ count_value: 5 }]];
      if (sql.includes("time_slots")) return [[{ count_value: 14 }]];
      if (sql.includes("FROM users")) return [[{ count_value: 1 }]];
      return [[{ ok: 1 }]];
    }
  };

  await assertRuntimeDatabaseReady(connection);
});

test("runtime database readiness rejects missing seed data", async () => {
  const connection = {
    execute: async (sql) => {
      if (sql.includes("reservation_statuses")) return [[{ count_value: 0 }]];
      if (sql.includes("time_slots")) return [[{ count_value: 14 }]];
      if (sql.includes("FROM users")) return [[{ count_value: 1 }]];
      return [[{ ok: 1 }]];
    }
  };

  await assert.rejects(
    assertRuntimeDatabaseReady(connection),
    /reservation statuses are missing/
  );
});

test("checkRuntimeDatabase closes the connection and reports success", async () => {
  const output = [];
  const connection = {
    execute: async (sql) => {
      if (sql.includes("reservation_statuses")) return [[{ count_value: 5 }]];
      if (sql.includes("time_slots")) return [[{ count_value: 14 }]];
      if (sql.includes("FROM users")) return [[{ count_value: 1 }]];
      return [[{ ok: 1 }]];
    },
    end: async () => {
      output.push("closed");
    }
  };

  const result = await checkRuntimeDatabase({
    env: { DB_NAME: "barangay_test" },
    mysqlClient: {
      createConnection: async () => connection
    },
    output: { log: (message) => output.push(message) }
  });

  assert.equal(result.database, "barangay_test");
  assert.deepEqual(output, [
    "closed",
    "Local database check passed for 'barangay_test'."
  ]);
});

test("checkRuntimeDatabase reports unreachable local MySQL without leaking passwords", async () => {
  await assert.rejects(
    checkRuntimeDatabase({
      env: {
        DB_HOST: "127.0.0.1",
        DB_PORT: "3306",
        DB_NAME: "barangay_test",
        DB_PASSWORD: "very-secret"
      },
      mysqlClient: {
        createConnection: async () => {
          throw new Error("connect ECONNREFUSED 127.0.0.1:3306");
        }
      },
      output: { log: () => {} }
    }),
    (error) => {
      assert.match(error.message, /Unable to connect to the local MySQL\/MariaDB database/);
      assert.doesNotMatch(error.message, /very-secret/);
      return true;
    }
  );
});
