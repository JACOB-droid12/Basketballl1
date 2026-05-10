(function bridgePrototypeToBackend() {
  const api = {
    async request(path, options = {}) {
      const response = await fetch(path, {
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          ...(options.headers || {})
        },
        ...options
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data.error || Object.values(data.errors || {})[0] || "Request failed.";
        throw new Error(message);
      }

      return data;
    }
  };

  function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function toPrototypeTime(value) {
    const [hoursText, minutesText] = String(value || "").split(":");
    let hours = Number(hoursText);
    const minutes = String(minutesText || "00").padStart(2, "0");
    const suffix = hours >= 12 ? "pm" : "am";

    if (hours === 0) hours = 12;
    if (hours > 12) hours -= 12;

    return `${hours}:${minutes}${suffix}`;
  }

  function toBackendTime(value) {
    const text = String(value || "").trim().toLowerCase();
    const match = text.match(/^(\d{1,2}):(\d{2})(am|pm)$/);

    if (!match) {
      return text;
    }

    let hours = Number(match[1]);
    const minutes = match[2];
    const suffix = match[3];

    if (suffix === "pm" && hours !== 12) hours += 12;
    if (suffix === "am" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  function weekOffsetForDate(date) {
    const currentStart = getWeekStart(0);
    const targetStart = new Date(date);
    targetStart.setDate(targetStart.getDate() - targetStart.getDay());
    targetStart.setHours(0, 0, 0, 0);
    return Math.round((targetStart - currentStart) / (7 * 24 * 60 * 60 * 1000));
  }

  function reservationDateToDayIndex(date) {
    return date.getDay();
  }

  function clearPrototypeReservations() {
    Object.keys(reservations).forEach((key) => {
      delete reservations[key];
    });
  }

  function applyReservationToPrototype(reservation) {
    if (!reservation || reservation.statusCode === "CANCELLED" || reservation.statusCode === "MISSED") {
      return;
    }

    const [year, month, day] = reservation.reservationDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekOffset = weekOffsetForDate(date);
    const dayIdx = reservationDateToDayIndex(date);
    const startTime = toPrototypeTime(reservation.startTime);
    const endTime = toPrototypeTime(reservation.endTime);
    const startIdx = TIME_SLOTS.indexOf(startTime);
    const endIdx = ALL_TIMES.indexOf(endTime);

    if (startIdx < 0 || endIdx <= startIdx) {
      return;
    }

    for (let index = startIdx; index < endIdx; index += 1) {
      reservations[resKey(weekOffset, dayIdx, index)] = {
        reservationId: reservation.reservationId,
        residentName: reservation.representativeName,
        contact: reservation.contactNo,
        startTime,
        endTime,
        remarks: reservation.remarks || reservation.purpose || "",
        loggedBy: reservation.createdByName || "Barangay Staff",
        statusCode: reservation.statusCode
      };
    }
  }

  async function refreshPrototypeReservations() {
    const data = await api.request("/api/prototype/reservations");
    clearPrototypeReservations();
    data.reservations.forEach(applyReservationToPrototype);
    renderHomeCalendar();
    renderSchedulePage();
  }

  async function refreshPrototypeAccounts() {
    if (!currentUser || currentUser.role !== "Admin") {
      return;
    }

    const data = await api.request("/api/prototype/accounts");
    accounts = data.accounts.map((account) => ({
      ...account,
      password: "",
      lastLogin: account.lastLogin || ""
    }));
    renderAccountsTable();
  }

  const originalIsSlotCompleted = window.isSlotCompleted;
  window.isSlotCompleted = function bridgedIsSlotCompleted(weekOffset, dayIdx, slotIdx) {
    const data = reservations[resKey(weekOffset, dayIdx, slotIdx)];

    if (data?.statusCode === "COMPLETED") {
      return true;
    }

    return originalIsSlotCompleted(weekOffset, dayIdx, slotIdx);
  };

  window.doLogin = async function bridgedLogin() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const error = document.getElementById("login-error");

    try {
      const data = await api.request("/api/prototype/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      currentUser = data.user;
      error.style.display = "none";

      document.getElementById("acc-fullname-display").value = currentUser.fullname;
      document.getElementById("acc-username-display").value = currentUser.username;
      document.getElementById("acc-role-display").value = currentUser.role;
      document.getElementById("create-account-section").style.display = currentUser.role === "Admin" ? "block" : "none";
      document.getElementById("manage-accounts-section").style.display = currentUser.role === "Admin" ? "block" : "none";

      await refreshPrototypeReservations();
      await refreshPrototypeAccounts();
      showPage("home-page");
    } catch (fetchError) {
      error.textContent = fetchError.message;
      error.style.display = "block";
    }
  };

  window.logout = async function bridgedLogout() {
    await api.request("/api/prototype/logout", { method: "POST", body: "{}" }).catch(() => {});
    currentUser = null;
    showPage("login-page");
  };

  window.submitReservation = async function bridgedSubmitReservation() {
    const residentName = document.getElementById("res-resident").value.trim();
    const contact = document.getElementById("res-contact").value.trim();
    const endTime = document.getElementById("res-end").value;
    const remarks = document.getElementById("res-remarks").value.trim();

    if (!residentName || !contact) {
      alert("Please enter the resident name and contact number.");
      return;
    }

    const { dayDate, startTime } = pendingSlot;

    try {
      await api.request("/api/prototype/reservations", {
        method: "POST",
        body: JSON.stringify({
          reservationDate: toIsoDate(dayDate),
          startTime: toBackendTime(startTime),
          endTime: toBackendTime(endTime),
          representativeName: residentName,
          contactNo: contact,
          remarks
        })
      });
      await refreshPrototypeReservations();
      showPage("home-page");
      showToast("Reservation confirmed!", "green");
    } catch (error) {
      alert(error.message);
    }
  };

  window.saveDetailEdit = async function bridgedSaveDetailEdit() {
    const { dayIdx, slotIdx } = currentDetailSlot;
    const data = reservations[resKey(currentWeekOffset, dayIdx, slotIdx)];
    const weekStart = getWeekStart(currentWeekOffset);
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayIdx);

    const residentName = document.getElementById("detail-resident").value.trim();
    const contact = document.getElementById("detail-contact").value.trim();
    const remarks = document.getElementById("detail-remarks").value.trim();
    const endTime = document.getElementById("detail-end-select").value;

    if (!residentName || !contact) {
      alert("Resident name and contact cannot be empty.");
      return;
    }

    try {
      await api.request(`/api/prototype/reservations/${data.reservationId}`, {
        method: "PUT",
        body: JSON.stringify({
          reservationDate: toIsoDate(dayDate),
          startTime: toBackendTime(data.startTime),
          endTime: toBackendTime(endTime),
          representativeName: residentName,
          contactNo: contact,
          remarks
        })
      });
      await refreshPrototypeReservations();
      setDetailReadOnly(true);
      document.getElementById("detail-edit-btn").style.display = "inline-block";
      document.getElementById("detail-save-btn").style.display = "none";
      document.getElementById("detail-cancel-btn").style.display = "none";
      showToast("Reservation updated!", "green");
    } catch (error) {
      alert(error.message);
    }
  };

  window.clearSingleSlot = async function bridgedClearSingleSlot() {
    const { dayIdx, slotIdx } = currentDetailSlot;
    const data = reservations[resKey(currentWeekOffset, dayIdx, slotIdx)];

    if (!data || !confirm(`Clear the reservation for ${DAYS[dayIdx]}, ${data.startTime} - ${data.endTime}?`)) {
      return;
    }

    try {
      await api.request(`/api/prototype/reservations/${data.reservationId}/status`, {
        method: "POST",
        body: JSON.stringify({ statusCode: "CANCELLED" })
      });
      await refreshPrototypeReservations();
      showPage("home-page");
      showToast("Slot cleared.", "yellow");
    } catch (error) {
      alert(error.message);
    }
  };

  window.saveAccount = async function bridgedSaveAccount() {
    const fullname = document.getElementById("new-fullname").value.trim();
    const username = document.getElementById("new-username").value.trim();
    const password = document.getElementById("new-password").value.trim();
    const isAdmin = document.getElementById("role-admin").checked;
    const isStaff = document.getElementById("role-staff").checked;

    if (!fullname || !username || !password || (!isAdmin && !isStaff)) {
      alert("Please complete all account fields and select a role.");
      return;
    }

    try {
      await api.request("/api/prototype/accounts", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullname,
          username,
          password,
          role: isAdmin ? "ADMIN" : "STAFF"
        })
      });
      document.getElementById("new-fullname").value = "";
      document.getElementById("new-username").value = "";
      document.getElementById("new-password").value = "";
      document.getElementById("role-admin").checked = false;
      document.getElementById("role-staff").checked = false;
      document.getElementById("save-success").style.display = "block";
      await refreshPrototypeAccounts();
      showToast("Account created successfully!", "green");
    } catch (error) {
      alert(error.message);
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const session = await api.request("/api/prototype/session");

      if (session.authenticated) {
        currentUser = session.user;
        document.getElementById("acc-fullname-display").value = currentUser.fullname;
        document.getElementById("acc-username-display").value = currentUser.username;
        document.getElementById("acc-role-display").value = currentUser.role;
        document.getElementById("create-account-section").style.display = currentUser.role === "Admin" ? "block" : "none";
        document.getElementById("manage-accounts-section").style.display = currentUser.role === "Admin" ? "block" : "none";
        await refreshPrototypeReservations();
        await refreshPrototypeAccounts();
        showPage("home-page");
      }
    } catch {
      showPage("login-page");
    }
  });
})();
