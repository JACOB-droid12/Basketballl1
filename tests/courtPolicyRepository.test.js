import assert from "node:assert/strict";
import test from "node:test";

import {
  getCourtPolicySettings,
  updateCourtPolicySettings,
  validateCourtPolicyInput,
  validateReservationAgainstCourtPolicy
} from "../src/features/settings/courtPolicyRepository.js";

test("reads court policy settings with normalized defaults", async () => {
  const db = {
    execute: async () => [[
      { setting_key: "opening_time", setting_value: "07:00:00" },
      { setting_key: "closing_time", setting_value: "21:00:00" },
      { setting_key: "min_reservation_minutes", setting_value: "30" },
      { setting_key: "max_reservation_minutes", setting_value: "180" },
      { setting_key: "allowed_days", setting_value: "0,1,2,3,4,5,6" },
      { setting_key: "blocked_days", setting_value: "2026-05-20" },
      { setting_key: "missed_grace_minutes", setting_value: "15" },
      { setting_key: "slot_minutes", setting_value: "60" }
    ]]
  };

  const policy = await getCourtPolicySettings(db);

  assert.deepEqual(policy, {
    openingTime: "07:00",
    closingTime: "21:00",
    minimumReservationMinutes: 30,
    maximumReservationMinutes: 180,
    allowedDays: [0, 1, 2, 3, 4, 5, 6],
    blockedDays: ["2026-05-20"],
    gracePeriodBeforeMissedMinutes: 15,
    defaultSlotMinutes: 60
  });
});

test("validates policy values before storage", () => {
  const result = validateCourtPolicyInput({
    openingTime: "21:00",
    closingTime: "07:00",
    minimumReservationMinutes: 120,
    maximumReservationMinutes: 60,
    allowedDays: [],
    blockedDays: ["2026-02-30"],
    gracePeriodBeforeMissedMinutes: -1,
    defaultSlotMinutes: 0
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, {
    timeRange: "Closing time must be after opening time.",
    maximumReservationMinutes: "Maximum duration must be at least the minimum duration.",
    allowedDays: "At least one allowed day is required.",
    blockedDays: "Blocked days must contain real YYYY-MM-DD dates.",
    gracePeriodBeforeMissedMinutes: "Grace period must be between 0 and 240 minutes.",
    defaultSlotMinutes: "Default slot size must be between 15 and 240 minutes."
  });
});

test("rejects reservations outside configured court policy", () => {
  const policy = {
    openingTime: "08:00",
    closingTime: "20:00",
    minimumReservationMinutes: 60,
    maximumReservationMinutes: 120,
    allowedDays: [1, 2, 3, 4, 5],
    blockedDays: ["2026-05-20"],
    gracePeriodBeforeMissedMinutes: 15,
    defaultSlotMinutes: 60
  };

  assert.deepEqual(validateReservationAgainstCourtPolicy({
    reservationDate: "2026-05-17",
    startTime: "08:00",
    endTime: "09:00"
  }, policy), {
    reservationDate: "Reservations are not allowed on this day of the week."
  });
  assert.deepEqual(validateReservationAgainstCourtPolicy({
    reservationDate: "2026-05-20",
    startTime: "08:00",
    endTime: "09:00"
  }, policy), {
    reservationDate: "Reservations are blocked on this date."
  });
  assert.deepEqual(validateReservationAgainstCourtPolicy({
    reservationDate: "2026-05-18",
    startTime: "07:30",
    endTime: "08:30"
  }, policy), {
    timeRange: "Reservation must be within court operating hours."
  });
  assert.deepEqual(validateReservationAgainstCourtPolicy({
    reservationDate: "2026-05-18",
    startTime: "08:00",
    endTime: "11:00"
  }, policy), {
    duration: "Reservation duration must be no more than 120 minutes."
  });
});

test("updates policy settings and writes an activity log", async () => {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    execute: async (sql, params = {}) => {
      if (sql.includes("FROM court_settings")) {
        calls.push("read-policy");
        return [[
          { setting_key: "opening_time", setting_value: "07:00:00" },
          { setting_key: "closing_time", setting_value: "21:00:00" },
          { setting_key: "min_reservation_minutes", setting_value: "30" },
          { setting_key: "max_reservation_minutes", setting_value: "240" },
          { setting_key: "allowed_days", setting_value: "0,1,2,3,4,5,6" },
          { setting_key: "blocked_days", setting_value: "" },
          { setting_key: "missed_grace_minutes", setting_value: "15" },
          { setting_key: "slot_minutes", setting_value: "60" }
        ]];
      }

      if (sql.includes("INSERT INTO court_settings")) {
        calls.push(["upsert-setting", params.settingKey, params.settingValue]);
        return [{ affectedRows: 1 }];
      }

      if (sql.includes("INSERT INTO activity_logs")) {
        calls.push(["insert-log", params.action]);
        return [{ affectedRows: 1 }];
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
  const db = { getConnection: async () => connection };

  const policy = await updateCourtPolicySettings(db, { maximumReservationMinutes: 180 }, { userId: 1 });

  assert.equal(policy.maximumReservationMinutes, 180);
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === "upsert-setting" && call[1] === "max_reservation_minutes"));
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === "insert-log" && call[1] === "UPDATE_COURT_POLICY"));
});
