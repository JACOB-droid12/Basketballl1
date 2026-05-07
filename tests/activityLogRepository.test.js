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
    search: "Admin"
  });

  assert.match(query.sql, /al\.action = :action/);
  assert.match(query.sql, /DATE\(al\.created_at\) = :date/);
  assert.match(query.sql, /user\.full_name LIKE :searchLike/);
  assert.doesNotMatch(query.sql, /Admin/);
  assert.deepEqual(query.params, {
    action: "UPDATE_RESERVATION",
    date: "2026-05-08",
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
    reservationDate: "2026-05-09",
    reservationStartTime: "07:00",
    reservationEndTime: "08:00"
  });
});
