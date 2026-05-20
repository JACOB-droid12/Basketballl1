import assert from "node:assert/strict";
import test from "node:test";

import {
  buildActivityLogListQuery,
  mapActivityLogRow
} from "../src/features/activityLogs/activityLogRepository.js";

test("builds activity log list query with parameterized filters", () => {
  const query = buildActivityLogListQuery({
    action: "UPDATE_RESERVATION",
    date: "2026-05-08",
    fromDate: "2026-05-01",
    toDate: "2026-05-31",
    search: "Admin"
  });

  assert.match(query.sql, /al\.action = :action/);
  assert.match(query.sql, /DATE\(al\.created_at\) = :date/);
  assert.match(query.sql, /DATE\(al\.created_at\) >= :fromDate/);
  assert.match(query.sql, /DATE\(al\.created_at\) <= :toDate/);
  assert.match(query.sql, /user\.full_name LIKE :searchLike/);
  assert.match(query.sql, /r\.reference_no/);
  assert.doesNotMatch(query.sql, /Admin/);
  assert.deepEqual(query.params, {
    action: "UPDATE_RESERVATION",
    date: "2026-05-08",
    fromDate: "2026-05-01",
    toDate: "2026-05-31",
    searchLike: "%Admin%"
  });
});

test("maps activity log rows to view models", () => {
  const log = mapActivityLogRow({
    log_id: 3,
    action: "CREATE_RESERVATION",
    details: "Created reservation.",
    created_at: "2026-05-08 09:15:00",
    user_name: "System Administrator",
    reservation_id: 10,
    reference_no: "BCS-2026-000010",
    reservation_date: "2026-05-09",
    reservation_start_time: "07:00:00",
    reservation_end_time: "08:00:00"
  });

  assert.deepEqual(log, {
    logId: 3,
    action: "CREATE_RESERVATION",
    details: "Created reservation.",
    createdAt: "2026-05-08 09:15:00",
    userName: "System Administrator",
    reservationId: 10,
    referenceNo: "BCS-2026-000010",
    reservationDate: "2026-05-09",
    reservationStartTime: "07:00",
    reservationEndTime: "08:00"
  });
});

test("maps activity log rows without a linked reservation reference safely", () => {
  const log = mapActivityLogRow({
    log_id: 4,
    action: "CHANGE_PASSWORD",
    details: "Changed a password.",
    created_at: "2026-05-08 10:15:00",
    user_name: null,
    reservation_id: null,
    reference_no: null,
    reservation_date: null,
    reservation_start_time: null,
    reservation_end_time: null
  });

  assert.equal(log.userName, "System");
  assert.equal(log.reservationId, null);
  assert.equal(log.referenceNo, "");
});
