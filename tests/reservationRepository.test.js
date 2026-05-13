import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReservationDetailQuery,
  buildReservationListQuery,
  buildReservationOverlapQuery,
  buildReservationUpdateQuery,
  mapReservationRow,
  ReservationNotFoundError,
  updateReservationStatus
} from "../src/features/reservations/reservationRepository.js";

test("builds reservation list query with parameterized filters", () => {
  const query = buildReservationListQuery({
    reservationDate: "2026-05-07",
    statusCode: "RESERVED",
    search: "Sto. Niño Youth",
    purpose: "Practice"
  });

  assert.match(query.sql, /r\.reservation_date = :reservationDate/);
  assert.match(query.sql, /rs\.status_code = :statusCode/);
  assert.match(query.sql, /resident\.full_name LIKE :searchLike/);
  assert.match(query.sql, /r\.purpose LIKE :purposeLike/);
  assert.doesNotMatch(query.sql, /Sto\. Niño Youth/);
  assert.deepEqual(query.params, {
    reservationDate: "2026-05-07",
    statusCode: "RESERVED",
    searchLike: "%Sto. Niño Youth%",
    purposeLike: "%Practice%"
  });
});

test("builds overlap query with active-status filtering and edit exclusion", () => {
  const query = buildReservationOverlapQuery({
    reservationId: 5,
    reservationDate: "2026-05-07",
    startTime: "07:00",
    endTime: "08:00"
  });

  assert.match(query.sql, /existing\.reservation_id <> :reservationId/);
  assert.match(query.sql, /existing_status\.is_blocking = 1/);
  assert.match(query.sql, /:startTime < existing\.end_time/);
  assert.match(query.sql, /:endTime > existing\.start_time/);
  assert.deepEqual(query.params, {
    reservationId: 5,
    reservationDate: "2026-05-07",
    startTime: "07:00",
    endTime: "08:00"
  });
});

test("builds reservation detail query with parameterized id lookup", () => {
  const query = buildReservationDetailQuery(12);

  assert.match(query.sql, /WHERE r\.reservation_id = :reservationId/);
  assert.match(query.sql, /LIMIT 1/);
  assert.doesNotMatch(query.sql, /12\s*$/);
  assert.deepEqual(query.params, { reservationId: 12 });
});

test("builds reservation update query with parameterized reservation and resident fields", () => {
  const query = buildReservationUpdateQuery({
    reservationId: 12,
    residentId: 5,
    statusId: 2,
    reservationDate: "2026-05-08",
    startTime: "07:00",
    endTime: "08:00",
    purpose: "Practice",
    remarks: "Updated remarks"
  });

  assert.match(query.sql, /UPDATE reservations/);
  assert.match(query.sql, /resident_id = :residentId/);
  assert.match(query.sql, /reservation_id = :reservationId/);
  assert.doesNotMatch(query.sql, /Updated remarks/);
  assert.deepEqual(query.params, {
    reservationId: 12,
    residentId: 5,
    statusId: 2,
    reservationDate: "2026-05-08",
    startTime: "07:00",
    endTime: "08:00",
    purpose: "Practice",
    remarks: "Updated remarks"
  });
});

test("maps reservation rows to view models", () => {
  const row = mapReservationRow({
    reservation_id: 12,
    reservation_date: "2026-05-07",
    start_time: "07:00:00",
    end_time: "08:00:00",
    purpose: "Practice",
    remarks: null,
    status_code: "RESERVED",
    status_name: "Reserved",
    resident_name: "Sto. Niño Youth Team",
    contact_no: "09171234567",
    address: "Purok 3",
    created_by_name: "Admin User"
  });

  assert.deepEqual(row, {
    reservationId: 12,
    reservationDate: "2026-05-07",
    startTime: "07:00",
    endTime: "08:00",
    purpose: "Practice",
    remarks: "",
    statusCode: "RESERVED",
    statusName: "Reserved",
    representativeName: "Sto. Niño Youth Team",
    contactNo: "09171234567",
    address: "Purok 3",
    createdByName: "Admin User"
  });
});

test("updateReservationStatus throws not found before writing activity log when reservation row is missing", async () => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    execute: async (sql) => {
      if (sql.includes("SELECT status_id")) {
        calls.push("select-status");
        return [[{ status_id: 3 }]];
      }

      if (sql.includes("SELECT reservation_id")) {
        calls.push("select-reservation");
        return [[]];
      }

      if (sql.includes("UPDATE reservations")) {
        calls.push("update-reservation");
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("INSERT INTO activity_logs")) {
        calls.push("insert-log");
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
  const db = {
    getConnection: async () => connection
  };

  await assert.rejects(
    () => updateReservationStatus(db, 404, "MISSED", { userId: 1 }),
    ReservationNotFoundError
  );

  assert.deepEqual(calls, ["begin", "select-status", "select-reservation", "rollback", "release"]);
});

test("updateReservationStatus writes activity log when existing reservation update is a no-op", async () => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    execute: async (sql) => {
      if (sql.includes("SELECT status_id")) {
        calls.push("select-status");
        return [[{ status_id: 3 }]];
      }

      if (sql.includes("SELECT reservation_id")) {
        calls.push("select-reservation");
        return [[{ reservation_id: 7 }]];
      }

      if (sql.includes("UPDATE reservations")) {
        calls.push("update-reservation");
        return [{ affectedRows: 0 }];
      }

      if (sql.includes("INSERT INTO activity_logs")) {
        calls.push("insert-log");
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
  const db = {
    getConnection: async () => connection
  };

  await updateReservationStatus(db, 7, "CANCELLED", { userId: 1 });

  assert.deepEqual(calls, [
    "begin",
    "select-status",
    "select-reservation",
    "update-reservation",
    "insert-log",
    "commit",
    "release"
  ]);
});
