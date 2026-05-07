const columns = [
  ["Reservation Date", "reservationDate"],
  ["Start Time", "startTime"],
  ["End Time", "endTime"],
  ["Representative", "representativeName"],
  ["Contact Number", "contactNo"],
  ["Address", "address"],
  ["Purpose", "purpose"],
  ["Status", "statusName"],
  ["Encoded By", "createdByName"]
];

export function toReservationCsv(reservations) {
  const header = columns.map(([label]) => label).join(",");
  const rows = reservations.map((reservation) =>
    columns.map(([, key]) => escapeCsv(reservation[key] || "")).join(",")
  );

  return [header, ...rows].join("\r\n");
}

function escapeCsv(value) {
  const text = String(value ?? "");

  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}
