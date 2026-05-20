import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResidentListQuery,
  createResidentDirectoryEntry,
  DuplicateResidentError,
  getResidentDirectoryEntryById,
  mapResidentRow,
  updateResidentDirectoryEntry
} from "../src/features/residents/residentRepository.js";

test("builds resident directory search query with safe parameters", () => {
  const query = buildResidentListQuery({ search: "Team", contactNumber: "09171234567" });

  assert.match(query.sql, /full_name LIKE :searchLike/);
  assert.match(query.sql, /contact_no = :contactNumber/);
  assert.deepEqual(query.params, {
    searchLike: "%Team%",
    contactNumber: "09171234567"
  });
});

test("maps resident rows with directory fields", () => {
  assert.deepEqual(mapResidentRow({
    resident_id: 5,
    full_name: "Team Alpha",
    contact_no: "09171234567",
    address: "Purok 3",
    group_name: "Youth",
    notes: "Bring permit",
    created_at: "2026-05-14 08:00:00",
    updated_at: "2026-05-15 09:00:00"
  }), {
    residentId: 5,
    name: "Team Alpha",
    contactNumber: "09171234567",
    address: "Purok 3",
    group: "Youth",
    notes: "Bring permit",
    createdAt: "2026-05-14 08:00:00",
    updatedAt: "2026-05-15 09:00:00"
  });
});

test("getResidentDirectoryEntryById reads one resident by safe id parameter", async () => {
  let receivedParams = null;
  const db = {
    execute: async (sql, params) => {
      assert.match(sql, /WHERE resident_id = :residentId/);
      assert.doesNotMatch(sql, /Team Alpha/);
      receivedParams = params;
      return [[{
        resident_id: 5,
        full_name: "Team Alpha",
        contact_no: "09171234567",
        address: "Purok 3",
        group_name: "Youth",
        notes: "",
        created_at: "2026-05-14 08:00:00",
        updated_at: "2026-05-15 09:00:00"
      }]];
    }
  };

  const resident = await getResidentDirectoryEntryById(db, 5);

  assert.equal(receivedParams.residentId, 5);
  assert.equal(resident.residentId, 5);
  assert.equal(resident.name, "Team Alpha");
});

test("createResidentDirectoryEntry rejects duplicate contact numbers", async () => {
  const connection = buildConnection(async (sql) => {
    if (sql.includes("SELECT resident_id")) {
      return [[{ resident_id: 9 }]];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const db = { getConnection: async () => connection };

  await assert.rejects(
    () => createResidentDirectoryEntry(db, buildResidentInput(), { userId: 1 }),
    DuplicateResidentError
  );
});

test("updateResidentDirectoryEntry writes changed directory fields and logs the action", async () => {
  const calls = [];
  const connection = buildConnection(async (sql, params = {}) => {
    if (sql.includes("SELECT resident_id") && sql.includes("contact_no = :contactNumber")) {
      calls.push("check-duplicate");
      return [[]];
    }

    if (sql.includes("UPDATE residents")) {
      calls.push(["update-resident", params]);
      return [{ affectedRows: 1 }];
    }

    if (sql.includes("INSERT INTO activity_logs")) {
      calls.push(["insert-log", params.action]);
      return [{ affectedRows: 1 }];
    }

    if (sql.includes("WHERE resident_id = :residentId")) {
      calls.push("read-resident");
      return [[{
        resident_id: 5,
        full_name: "Team Alpha",
        contact_no: "09171234567",
        address: "Purok 3",
        group_name: "Youth",
        notes: "",
        created_at: "2026-05-14 08:00:00",
        updated_at: "2026-05-15 09:00:00"
      }]];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }, calls);
  const db = { getConnection: async () => connection };

  const resident = await updateResidentDirectoryEntry(db, 5, buildResidentInput(), { userId: 1 });

  assert.equal(resident.residentId, 5);
  assert.deepEqual(calls.map((call) => Array.isArray(call) ? call[0] : call), [
    "begin",
    "check-duplicate",
    "update-resident",
    "insert-log",
    "read-resident",
    "commit",
    "release"
  ]);
});

function buildConnection(execute, calls = []) {
  return {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    execute
  };
}

function buildResidentInput(overrides = {}) {
  return {
    name: "Team Alpha",
    contactNumber: "09171234567",
    address: "Purok 3",
    group: "Youth",
    notes: "",
    ...overrides
  };
}
