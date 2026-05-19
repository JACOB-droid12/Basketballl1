import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReservationDetailQuery,
  buildReservationListQuery,
  buildReservationOverlapQuery,
  buildReservationUpdateQuery,
  createReservation,
  mapReservationRow,
  reserveNextReservationReference,
  ReservationNotFoundError,
  updateReservation,
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

test("builds reservation list query with inclusive report date range filters", () => {
  const query = buildReservationListQuery({
    fromDate: "2026-05-10",
    toDate: "2026-05-12"
  });

  assert.match(query.sql, /r\.reservation_date >= :fromDate/);
  assert.match(query.sql, /r\.reservation_date <= :toDate/);
  assert.deepEqual(query.params, {
    fromDate: "2026-05-10",
    toDate: "2026-05-12"
  });
});

test("builds reservation list query with resident history filters", () => {
  const query = buildReservationListQuery({
    contactNumber: "09171234567",
    representativeName: "Team Alpha"
  });

  assert.match(query.sql, /resident\.contact_no = :contactNumber/);
  assert.match(query.sql, /resident\.full_name LIKE :representativeNameLike/);
  assert.deepEqual(query.params, {
    contactNumber: "09171234567",
    representativeNameLike: "%Team Alpha%"
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
    reference_no: "BCS-2026-000012",
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
    referenceNo: "BCS-2026-000012",
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

test("reserves the next yearly reference number while holding the sequence row lock", async () => {
  const calls = [];
  const connection = {
    execute: async (sql, params = {}) => {
      if (sql.includes("INSERT INTO reservation_reference_sequences")) {
        calls.push({ step: "ensure-sequence", params });
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("FOR UPDATE")) {
        calls.push({ step: "lock-sequence", params });
        return [[{ next_sequence: 4 }]];
      }

      if (sql.includes("MAX(CAST(SUBSTRING(reference_no, 10)")) {
        calls.push({ step: "read-existing-max", params });
        return [[{ max_sequence: 7 }]];
      }

      if (sql.includes("UPDATE reservation_reference_sequences")) {
        calls.push({ step: "advance-sequence", params });
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  const referenceNo = await reserveNextReservationReference(connection, "2026-05-14");

  assert.equal(referenceNo, "BCS-2026-000008");
  assert.deepEqual(calls, [
    { step: "ensure-sequence", params: { referenceYear: 2026 } },
    { step: "lock-sequence", params: { referenceYear: 2026 } },
    { step: "read-existing-max", params: { referencePrefix: "BCS-2026-%" } },
    { step: "advance-sequence", params: { referenceYear: 2026, nextSequence: 9 } }
  ]);
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

test("updateReservation throws not found before creating resident or writing activity log when reservation row is missing", async () => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    execute: async (sql) => {
      if (sql.includes("GET_LOCK")) {
        calls.push("lock");
        return [[{ lock_result: 1 }]];
      }

      if (sql.includes("RELEASE_LOCK")) {
        calls.push("unlock");
        return [[{ release_result: 1 }]];
      }

      if (sql.includes("SELECT reservation_id") && sql.includes("FROM reservations")) {
        calls.push("select-reservation");
        return [[]];
      }

      if (sql.includes("SELECT") && sql.includes("existing.reservation_id")) {
        calls.push("select-overlap");
        return [[]];
      }

      if (sql.includes("SELECT resident_id")) {
        calls.push("select-resident");
        return [[]];
      }

      if (sql.includes("INSERT INTO residents")) {
        calls.push("insert-resident");
        return [{ insertId: 9 }];
      }

      if (sql.includes("SELECT status_id")) {
        calls.push("select-status");
        return [[{ status_id: 2 }]];
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

  await assert.rejects(
    () => updateReservation(db, 404, buildReservationInput(), { userId: 1 }),
    ReservationNotFoundError
  );

  assert.deepEqual(calls, ["begin", "lock", "select-reservation", "rollback", "unlock", "release"]);
});

test("createReservation requires an explicit authenticated creator user id", async () => {
  const db = {
    getConnection: async () => {
      throw new Error("database connection should not be opened without a creator user id");
    }
  };

  await assert.rejects(
    () => createReservation(db, buildReservationInput()),
    /Authenticated user ID is required/
  );
});

test("updateReservation requires an explicit authenticated user id", async () => {
  const db = {
    getConnection: async () => {
      throw new Error("database connection should not be opened without a user id");
    }
  };

  await assert.rejects(
    () => updateReservation(db, 7, buildReservationInput()),
    /Authenticated user ID is required/
  );
});

test("updateReservationStatus requires an explicit authenticated user id", async () => {
  const db = {
    getConnection: async () => {
      throw new Error("database connection should not be opened without a user id");
    }
  };

  await assert.rejects(
    () => updateReservationStatus(db, 7, "COMPLETED"),
    /Authenticated user ID is required/
  );
});

test("createReservation writes activity log with the supplied creator user id", async () => {
  let insertedReservationId = 0;
  let activityLogParams = null;
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql, params = {}) => {
      if (sql.includes("GET_LOCK")) {
        return [[{ lock_result: 1 }]];
      }

      if (sql.includes("RELEASE_LOCK")) {
        return [[{ release_result: 1 }]];
      }

      if (sql.includes("existing.reservation_id")) {
        return [[]];
      }

      if (sql.includes("FROM court_settings")) {
        return [courtPolicyRows()];
      }

      if (sql.includes("FROM schedule_blocks") && sql.includes("sb.is_active = 1")) {
        return [[]];
      }

      if (sql.includes("SELECT resident_id")) {
        return [[{ resident_id: 5 }]];
      }

      if (sql.includes("SELECT status_id")) {
        return [[{ status_id: 2 }]];
      }

      if (sql.includes("INSERT INTO reservation_reference_sequences")) {
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("FROM reservation_reference_sequences") && sql.includes("FOR UPDATE")) {
        return [[{ next_sequence: 77 }]];
      }

      if (sql.includes("MAX(CAST(SUBSTRING(reference_no, 10)")) {
        return [[{ max_sequence: 76 }]];
      }

      if (sql.includes("UPDATE reservation_reference_sequences")) {
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("INSERT INTO reservations")) {
        insertedReservationId = 77;
        assert.equal(params.referenceNo, "BCS-2026-000077");
        assert.equal(params.createdByUserId, 42);
        assert.equal(params.approvedByUserId, 42);
        return [{ insertId: insertedReservationId }];
      }

      if (sql.includes("INSERT INTO activity_logs")) {
        activityLogParams = params;
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
  const db = {
    getConnection: async () => connection
  };

  const reservationId = await createReservation(db, buildReservationInput(), { createdByUserId: 42 });

  assert.equal(reservationId, insertedReservationId);
  assert.equal(activityLogParams.userId, 42);
  assert.equal(activityLogParams.action, "CREATE_RESERVATION");
});

test("createReservation serializes writes with a reservation-date advisory lock", async () => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    execute: async (sql) => {
      if (sql.includes("GET_LOCK")) {
        calls.push("lock");
        return [[{ lock_result: 1 }]];
      }

      if (sql.includes("RELEASE_LOCK")) {
        calls.push("unlock");
        return [[{ release_result: 1 }]];
      }

      if (sql.includes("existing.reservation_id")) {
        calls.push("select-overlap");
        return [[]];
      }

      if (sql.includes("FROM court_settings")) {
        calls.push("read-policy");
        return [courtPolicyRows()];
      }

      if (sql.includes("FROM schedule_blocks") && sql.includes("sb.is_active = 1")) {
        calls.push("check-block-overlap");
        return [[]];
      }

      if (sql.includes("SELECT resident_id")) {
        calls.push("select-resident");
        return [[{ resident_id: 5 }]];
      }

      if (sql.includes("SELECT status_id")) {
        calls.push("select-status");
        return [[{ status_id: 2 }]];
      }

      if (sql.includes("INSERT INTO reservation_reference_sequences")) {
        calls.push("ensure-reference-sequence");
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("FROM reservation_reference_sequences") && sql.includes("FOR UPDATE")) {
        calls.push("lock-reference-sequence");
        return [[{ next_sequence: 77 }]];
      }

      if (sql.includes("MAX(CAST(SUBSTRING(reference_no, 10)")) {
        calls.push("read-reference-max");
        return [[{ max_sequence: 76 }]];
      }

      if (sql.includes("UPDATE reservation_reference_sequences")) {
        calls.push("advance-reference-sequence");
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("INSERT INTO reservations")) {
        calls.push("insert-reservation");
        return [{ insertId: 77 }];
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

  await createReservation(db, buildReservationInput(), { createdByUserId: 42 });

  assert.deepEqual(calls, [
    "begin",
    "lock",
    "select-overlap",
    "read-policy",
    "check-block-overlap",
    "select-resident",
    "select-status",
    "ensure-reference-sequence",
    "lock-reference-sequence",
    "read-reference-max",
    "advance-reference-sequence",
    "insert-reservation",
    "insert-log",
    "commit",
    "unlock",
    "release"
  ]);
});

test("updateReservation writes activity log when existing reservation update is a no-op", async () => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    execute: async (sql) => {
      if (sql.includes("GET_LOCK")) {
        calls.push("lock");
        return [[{ lock_result: 1 }]];
      }

      if (sql.includes("RELEASE_LOCK")) {
        calls.push("unlock");
        return [[{ release_result: 1 }]];
      }

      if (sql.includes("SELECT reservation_id") && sql.includes("FROM reservations")) {
        calls.push("select-reservation");
        return [[{ reservation_id: 7 }]];
      }

      if (sql.includes("SELECT") && sql.includes("existing.reservation_id")) {
        calls.push("select-overlap");
        return [[]];
      }

      if (sql.includes("FROM court_settings")) {
        calls.push("read-policy");
        return [courtPolicyRows()];
      }

      if (sql.includes("FROM schedule_blocks") && sql.includes("sb.is_active = 1")) {
        calls.push("check-block-overlap");
        return [[]];
      }

      if (sql.includes("SELECT resident_id")) {
        calls.push("select-resident");
        return [[{ resident_id: 5 }]];
      }

      if (sql.includes("SELECT status_id")) {
        calls.push("select-status");
        return [[{ status_id: 2 }]];
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

  await updateReservation(db, 7, buildReservationInput(), { userId: 1 });

  assert.deepEqual(calls, [
    "begin",
    "lock",
    "select-reservation",
    "select-overlap",
    "read-policy",
    "check-block-overlap",
    "select-resident",
    "select-status",
    "update-reservation",
    "insert-log",
    "commit",
    "unlock",
    "release"
  ]);
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

function buildReservationInput(overrides = {}) {
  return {
    reservationDate: "2026-05-14",
    startTime: "08:00",
    endTime: "09:00",
    representativeName: "Team Alpha",
    contactNo: "09171234567",
    address: "Purok 3",
    purpose: "Practice",
    remarks: "",
    statusCode: "RESERVED",
    ...overrides
  };
}

function courtPolicyRows() {
  return [
    { setting_key: "opening_time", setting_value: "07:00:00" },
    { setting_key: "closing_time", setting_value: "21:00:00" },
    { setting_key: "min_reservation_minutes", setting_value: "30" },
    { setting_key: "max_reservation_minutes", setting_value: "240" },
    { setting_key: "allowed_days", setting_value: "0,1,2,3,4,5,6" },
    { setting_key: "blocked_days", setting_value: "" },
    { setting_key: "missed_grace_minutes", setting_value: "15" },
    { setting_key: "slot_minutes", setting_value: "60" }
  ];
}
