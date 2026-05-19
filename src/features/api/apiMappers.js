const STATUS_LABELS = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  MISSED: "Missed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  MAINTENANCE: "Maintenance",
  BARANGAY_EVENT: "Barangay event",
  CLEARED_PUBLIC_USE: "Cleared for public use"
};

export function toApiUser(user) {
  if (!user) {
    return null;
  }

  return {
    userId: user.userId,
    fullName: user.fullName,
    username: user.username,
    role: normalizeRole(user.role)
  };
}

export function toApiAccount(user) {
  if (!user) {
    return null;
  }

  return {
    userId: user.userId,
    fullName: user.fullName,
    username: user.username,
    role: normalizeRole(user.role),
    accountStatus: user.accountStatus || "ACTIVE",
    createdAt: user.createdAt || ""
  };
}

export function toApiReservation(reservation) {
  if (!reservation) {
    return null;
  }

  const statusCode = normalizeStatus(reservation.statusCode);

  return {
    reservationId: reservation.reservationId,
    referenceNo: reservation.referenceNo || "",
    reservationDate: reservation.reservationDate,
    startTime: normalizeTime(reservation.startTime),
    endTime: normalizeTime(reservation.endTime),
    representativeName: reservation.representativeName,
    contactNo: reservation.contactNo,
    address: reservation.address,
    purpose: reservation.purpose || "",
    remarks: reservation.remarks || "",
    statusCode,
    statusName: STATUS_LABELS[statusCode] || statusCode,
    createdByName: reservation.createdByName || ""
  };
}

export function toApiScheduleSlot(slot) {
  if (!slot) {
    return null;
  }

  const statusCode = normalizeStatus(slot.statusCode);

  return {
    slotId: slot.slotId,
    name: slot.name,
    startTime: normalizeTime(slot.startTime),
    endTime: normalizeTime(slot.endTime),
    statusCode,
    statusName: STATUS_LABELS[statusCode] || slot.statusName || statusCode,
    isAvailableForBooking: Boolean(slot.isAvailableForBooking),
    reservation: toApiReservation(slot.reservation),
    block: toApiScheduleBlock(slot.block)
  };
}

export function toApiScheduleBlock(block) {
  if (!block) {
    return null;
  }

  const statusCode = normalizeStatus(block.statusCode || block.type || block.category);

  return {
    blockId: block.blockId,
    date: block.date,
    startTime: normalizeTime(block.startTime),
    endTime: normalizeTime(block.endTime),
    mode: block.mode || "TIME_RANGE",
    category: block.category || "",
    type: block.type || "",
    statusCode,
    statusName: STATUS_LABELS[statusCode] || block.statusName || statusCode,
    reason: block.reason || "",
    createdByName: block.createdByName || "",
    createdAt: block.createdAt || "",
    isActive: block.isActive !== false
  };
}

export function normalizeTime(value) {
  const match = String(value || "").match(/\d{2}:\d{2}/);
  return match ? match[0] : "";
}

function normalizeRole(role) {
  return String(role || "").toUpperCase();
}

function normalizeStatus(statusCode) {
  return String(statusCode || "AVAILABLE").toUpperCase();
}
