import assert from "node:assert/strict";
import test from "node:test";

import {
  clearPublicUseRange,
  createScheduleBlock,
  deactivateScheduleBlock,
  findActiveScheduleBlockOverlap,
  mapScheduleBlockRow,
  ScheduleBlockConflictError
} from "../src/features/schedule/scheduleBlockRepository.js";

test("maps schedule block rows to API-ready block models", () => {
  const block = mapScheduleBlockRow({
    block_id: 7,
    block_category: "PUBLIC_USE",
    block_type: "CLEARED_PUBLIC_USE",
    mode: "WHOLE_DAY",
    reservation_date: "2026-05-14",
    start_time: "07:00:00",
    end_time: "21:00:00",
    reason: "Barangay public use",
    is_active: 1,
    created_at: "2026-05-13 08:00:00",
    created_by_name: "Admin User"
  });

  assert.deepEqual(block, {
    blockId: 7,
    category: "PUBLIC_USE",
    type: "CLEARED_PUBLIC_USE",
    mode: "WHOLE_DAY",
    date: "2026-05-14",
    startTime: "07:00",
    endTime: "21:00",
    reason: "Barangay public use",
    isActive: true,
    createdAt: "2026-05-13 08:00:00",
    createdByName: "Admin User",
    statusCode: "CLEARED_PUBLIC_USE"
  });
});

test("findActiveScheduleBlockOverlap uses active date/time overlap filtering", async () => {
  const connection = {
    execute: async (sql, params) => {
      assert.match(sql, /sb\.is_active = 1/);
      assert.match(sql, /:startTime < sb\.end_time/);
      assert.match(sql, /:endTime > sb\.start_time/);
      assert.deepEqual(params, {
        reservationDate: "2026-05-14",
        startTime: "08:00",
        endTime: "09:00"
      });
      return [[{
        block_id: 4,
        block_category: "MAINTENANCE",
        block_type: "REPAIRS",
        mode: "TIME_RANGE",
        reservation_date: "2026-05-14",
        start_time: "08:00:00",
        end_time: "09:00:00",
        reason: "Ring repair",
        is_active: 1
      }]];
    }
  };

  const overlap = await findActiveScheduleBlockOverlap(connection, {
    reservationDate: "2026-05-14",
    startTime: "08:00",
    endTime: "09:00"
  });

  assert.equal(overlap.statusCode, "MAINTENANCE");
  assert.equal(overlap.reason, "Ring repair");
});

test("createScheduleBlock stores an admin block and writes an activity log", async () => {
  const calls = [];
  const connection = buildConnection({
    calls,
    execute: async (sql, params = {}) => {
      if (sql.includes("GET_LOCK")) {
        calls.push("lock");
        return [[{ lock_result: 1 }]];
      }

      if (sql.includes("RELEASE_LOCK")) {
        calls.push("unlock");
        return [[{ release_result: 1 }]];
      }

      if (sql.includes("FROM schedule_blocks") && sql.includes("sb.is_active = 1")) {
        calls.push("check-overlap");
        return [[]];
      }

      if (sql.includes("INSERT INTO schedule_blocks")) {
        calls.push(["insert-block", params]);
        return [{ insertId: 15 }];
      }

      if (sql.includes("INSERT INTO activity_logs")) {
        calls.push(["insert-log", params.action]);
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("WHERE sb.block_id = :blockId")) {
        calls.push("read-block");
        return [[{
          block_id: 15,
          block_category: "MAINTENANCE",
          block_type: "REPAIRS",
          mode: "TIME_RANGE",
          reservation_date: "2026-05-14",
          start_time: "08:00:00",
          end_time: "09:00:00",
          reason: "Ring repair",
          is_active: 1
        }]];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  });
  const db = { getConnection: async () => connection };

  const block = await createScheduleBlock(db, {
    date: "2026-05-14",
    startTime: "08:00",
    endTime: "09:00",
    category: "MAINTENANCE",
    type: "REPAIRS",
    mode: "TIME_RANGE",
    reason: "Ring repair"
  }, { userId: 10 });

  assert.equal(block.blockId, 15);
  assert.equal(block.statusCode, "MAINTENANCE");
  assert.deepEqual(calls.map((call) => Array.isArray(call) ? call[0] : call), [
    "begin",
    "lock",
    "check-overlap",
    "insert-block",
    "insert-log",
    "read-block",
    "commit",
    "unlock",
    "release"
  ]);
});

test("createScheduleBlock rejects overlap with an existing active block", async () => {
  const connection = buildConnection({
    execute: async (sql) => {
      if (sql.includes("GET_LOCK")) return [[{ lock_result: 1 }]];
      if (sql.includes("RELEASE_LOCK")) return [[{ release_result: 1 }]];
      if (sql.includes("FROM schedule_blocks") && sql.includes("sb.is_active = 1")) {
        return [[{
          block_id: 15,
          block_category: "PUBLIC_USE",
          block_type: "CLEARED_PUBLIC_USE",
          mode: "TIME_RANGE",
          reservation_date: "2026-05-14",
          start_time: "08:00:00",
          end_time: "09:00:00",
          reason: "Public use",
          is_active: 1
        }]];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  });
  const db = { getConnection: async () => connection };

  await assert.rejects(
    () => createScheduleBlock(db, {
      date: "2026-05-14",
      startTime: "08:30",
      endTime: "09:30",
      category: "MAINTENANCE",
      type: "REPAIRS",
      mode: "TIME_RANGE",
      reason: "Ring repair"
    }, { userId: 10 }),
    ScheduleBlockConflictError
  );
});

test("clearPublicUseRange creates a public-use block and cancels overlapping reserved reservations", async () => {
  const calls = [];
  const connection = buildConnection({
    calls,
    execute: async (sql, params = {}) => {
      if (sql.includes("GET_LOCK")) {
        calls.push("lock");
        return [[{ lock_result: 1 }]];
      }

      if (sql.includes("RELEASE_LOCK")) {
        calls.push("unlock");
        return [[{ release_result: 1 }]];
      }

      if (sql.includes("FROM schedule_blocks") && sql.includes("sb.is_active = 1")) {
        calls.push("check-block-overlap");
        return [[]];
      }

      if (sql.includes("SELECT") && sql.includes("FROM reservations r") && sql.includes("rs.status_code = 'RESERVED'")) {
        calls.push("select-overlapping-reservations");
        return [[
          reservationRow({ reservation_id: 1, reference_no: "BCS-2026-000001", start_time: "08:00:00", end_time: "09:00:00" }),
          reservationRow({ reservation_id: 2, reference_no: "BCS-2026-000002", start_time: "09:00:00", end_time: "10:00:00" })
        ]];
      }

      if (sql.includes("SELECT status_id") && params.statusCode === "CANCELLED") {
        calls.push("select-cancelled-status");
        return [[{ status_id: 4 }]];
      }

      if (sql.includes("UPDATE reservations")) {
        calls.push(["cancel-reservations", [params.reservationId0, params.reservationId1]]);
        return [{ affectedRows: 2 }];
      }

      if (sql.includes("INSERT INTO schedule_blocks")) {
        calls.push(["insert-block", params]);
        return [{ insertId: 20 }];
      }

      if (sql.includes("INSERT INTO activity_logs")) {
        calls.push(["insert-log", params.action, params.reservationId ?? null]);
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("WHERE sb.block_id = :blockId")) {
        calls.push("read-block");
        return [[{
          block_id: 20,
          block_category: "PUBLIC_USE",
          block_type: "CLEARED_PUBLIC_USE",
          mode: "TIME_RANGE",
          reservation_date: "2026-05-14",
          start_time: "08:00:00",
          end_time: "10:00:00",
          reason: "Open public play",
          is_active: 1
        }]];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  });
  const db = { getConnection: async () => connection };

  const result = await clearPublicUseRange(db, {
    date: "2026-05-14",
    startTime: "08:00",
    endTime: "10:00",
    mode: "TIME_RANGE",
    reason: "Open public play"
  }, { userId: 10 });

  assert.equal(result.block.statusCode, "CLEARED_PUBLIC_USE");
  assert.deepEqual(result.cancelledReservations.map((reservation) => reservation.referenceNo), [
    "BCS-2026-000001",
    "BCS-2026-000002"
  ]);
  assert.deepEqual(calls.map((call) => Array.isArray(call) ? call[0] : call), [
    "begin",
    "lock",
    "check-block-overlap",
    "select-overlapping-reservations",
    "select-cancelled-status",
    "cancel-reservations",
    "insert-block",
    "insert-log",
    "insert-log",
    "insert-log",
    "read-block",
    "commit",
    "unlock",
    "release"
  ]);
});

test("deactivateScheduleBlock marks a block inactive and logs removal", async () => {
  const calls = [];
  const connection = buildConnection({
    calls,
    execute: async (sql, params = {}) => {
      if (sql.includes("SELECT") && sql.includes("WHERE sb.block_id = :blockId")) {
        calls.push("read-existing");
        return [[{
          block_id: 20,
          block_category: "MAINTENANCE",
          block_type: "REPAIRS",
          mode: "TIME_RANGE",
          reservation_date: "2026-05-14",
          start_time: "08:00:00",
          end_time: "09:00:00",
          reason: "Ring repair",
          is_active: 1
        }]];
      }

      if (sql.includes("UPDATE schedule_blocks")) {
        calls.push(["deactivate", params]);
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("INSERT INTO activity_logs")) {
        calls.push(["insert-log", params.action]);
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  });
  const db = { getConnection: async () => connection };

  const block = await deactivateScheduleBlock(db, 20, { userId: 10 });

  assert.equal(block.isActive, false);
  assert.deepEqual(calls.map((call) => Array.isArray(call) ? call[0] : call), [
    "begin",
    "read-existing",
    "deactivate",
    "insert-log",
    "commit",
    "release"
  ]);
});

function buildConnection({ calls = [], execute }) {
  return {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    execute: async (...args) => execute(...args),
    calls
  };
}

function reservationRow(overrides = {}) {
  return {
    reservation_id: 1,
    reference_no: "BCS-2026-000001",
    reservation_date: "2026-05-14",
    start_time: "08:00:00",
    end_time: "09:00:00",
    purpose: "Practice",
    remarks: "",
    status_code: "RESERVED",
    status_name: "Reserved",
    resident_name: "Team Alpha",
    contact_no: "09171234567",
    address: "Purok 3",
    created_by_name: "Admin User",
    ...overrides
  };
}
