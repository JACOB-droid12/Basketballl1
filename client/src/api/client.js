export async function apiRequest(path, options = {}) {
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
    const error = new Error(data.error || firstValidationError(data.errors) || "Request failed.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function getSession() {
  return apiRequest("/api/session");
}

export function login(payload) {
  return apiRequest("/api/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function logout() {
  return apiRequest("/api/logout", {
    method: "POST",
    body: "{}"
  });
}

function firstValidationError(errors) {
  return Object.values(errors || {})[0] || "";
}
