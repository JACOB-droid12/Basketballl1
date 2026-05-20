export function rowsToCsv(columns, rows) {
  const header = columns.map(([label]) => escapeCsv(label)).join(",");
  const body = rows.map((row) => columns.map(([, key]) => escapeCsv(resolveValue(row, key))).join(","));

  return [header, ...body].join("\r\n");
}

export function buildDailyScheduleCsv({ slots = [] }) {
  return rowsToCsv([
    ["Date", "date"],
    ["Start Time", "startTime"],
    ["End Time", "endTime"],
    ["Status", "statusName"],
    ["Reference No", "referenceNo"],
    ["Resident/Group", "representativeName"],
    ["Contact Number", "contactNo"],
    ["Purpose", "purpose"],
    ["Block Type", "blockType"],
    ["Reason/Remarks", "remarks"]
  ], slots.map((slot) => ({
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    statusName: slot.statusName,
    referenceNo: slot.reservation?.referenceNo || "",
    representativeName: slot.reservation?.representativeName || "",
    contactNo: slot.reservation?.contactNo || "",
    purpose: slot.reservation?.purpose || "",
    blockType: slot.block?.type || "",
    remarks: slot.block?.reason || slot.reservation?.remarks || ""
  })));
}

export function buildWeeklyScheduleCsv({ rows = [] }) {
  return rowsToCsv([
    ["Date", "date"],
    ["Slot", "slotName"],
    ["Start Time", "startTime"],
    ["End Time", "endTime"],
    ["Status", "statusName"],
    ["Reference No", "referenceNo"],
    ["Resident/Group", "representativeName"],
    ["Purpose", "purpose"],
    ["Block Reason", "blockReason"]
  ], rows.flatMap((row) => row.cells.map((cell) => ({
    date: cell.date,
    slotName: row.name,
    startTime: cell.startTime,
    endTime: cell.endTime,
    statusName: cell.statusName,
    referenceNo: cell.reservation?.referenceNo || "",
    representativeName: cell.reservation?.representativeName || "",
    purpose: cell.reservation?.purpose || "",
    blockReason: cell.block?.reason || ""
  }))));
}

export function buildReservationsCsv(reservations = []) {
  return rowsToCsv([
    ["Reference No", "referenceNo"],
    ["Reservation Date", "reservationDate"],
    ["Start Time", "startTime"],
    ["End Time", "endTime"],
    ["Resident/Group", "representativeName"],
    ["Contact Number", "contactNo"],
    ["Address", "address"],
    ["Purpose", "purpose"],
    ["Status", "statusName"],
    ["Encoded By", "createdByName"]
  ], reservations);
}

export function buildActivityLogsCsv(logs = []) {
  return rowsToCsv([
    ["Date/Time", "createdAt"],
    ["Action", "action"],
    ["User", "userName"],
    ["Reservation ID", "reservationId"],
    ["Reservation Reference No", "referenceNo"],
    ["Reservation Date", "reservationDate"],
    ["Start Time", "reservationStartTime"],
    ["End Time", "reservationEndTime"],
    ["Details", "details"]
  ], logs);
}

export function buildReportsCsv(report) {
  const rows = [
    { section: "Summary", metric: "Total reservations", value: report.summary.totalReservations },
    { section: "Summary", metric: "Court hours booked", value: report.summary.courtHoursBooked },
    { section: "Summary", metric: "Reserved count", value: report.summary.reservedCount },
    { section: "Summary", metric: "Missed count", value: report.summary.missedCount },
    { section: "Summary", metric: "Completed count", value: report.summary.completedCount },
    { section: "Summary", metric: "Cancelled count", value: report.summary.cancelledCount },
    ...report.mostUsedDays.map((item) => ({ section: "Most used days", metric: item.day, value: item.count, extra: item.hours })),
    ...report.mostUsedTimeSlots.map((item) => ({ section: "Most used time slots", metric: item.label, value: item.count, extra: item.hours })),
    ...report.reservationsByPurpose.map((item) => ({ section: "Reservations by purpose", metric: item.purpose, value: item.count, extra: item.hours })),
    ...report.reservationsEncodedByStaff.map((item) => ({ section: "Reservations encoded by staff", metric: item.staffName, value: item.count })),
    ...report.monthlyReservationCount.map((item) => ({ section: "Monthly reservation count", metric: item.month, value: item.count })),
    ...report.clearedPublicUseRanges.map((item) => ({ section: "Cleared public use", metric: item.date, value: item.reason, extra: `${item.startTime}-${item.endTime}` })),
    ...report.maintenanceBlocks.map((item) => ({ section: "Maintenance blocks", metric: item.date, value: item.reason, extra: `${item.startTime}-${item.endTime}` }))
  ];

  return rowsToCsv([
    ["Section", "section"],
    ["Metric", "metric"],
    ["Value", "value"],
    ["Extra", "extra"]
  ], rows);
}

function resolveValue(row, key) {
  return row[key] ?? "";
}

function escapeCsv(value) {
  const text = String(value ?? "");

  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}
