// ---------------------------------------------------------
// TripMind frontend — API base + fetch helper
// Change API_BASE if your backend runs on a different host/port.
// ---------------------------------------------------------
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8000"
  : "http://localhost:8000"; // update this for production deployment

async function apiRequest(path, { method = "GET", body = null, auth = false, isAdmin = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = isAdmin ? localStorage.getItem("tm_admin_token") : localStorage.getItem("tm_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  let data = null;
  try { data = await res.json(); } catch (e) { /* no JSON body */ }

  if (!res.ok) {
    const message = (data && data.detail) ? data.detail : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// ---------- Auth state helpers ----------
const Auth = {
  isLoggedIn: () => !!localStorage.getItem("tm_token"),
  isAdmin: () => !!localStorage.getItem("tm_admin_token"),
  userId: () => localStorage.getItem("tm_user_id"),
  userName: () => localStorage.getItem("tm_user_name"),

  setUser(data) {
    localStorage.setItem("tm_token", data.access_token);
    localStorage.setItem("tm_user_id", data.user_id);
    localStorage.setItem("tm_user_name", data.name);
  },
  setAdmin(data) {
    localStorage.setItem("tm_admin_token", data.access_token);
    localStorage.setItem("tm_admin_name", data.name);
  },
  logout() {
    localStorage.removeItem("tm_token");
    localStorage.removeItem("tm_user_id");
    localStorage.removeItem("tm_user_name");
    window.location.href = "index.html";
  },
  adminLogout() {
    localStorage.removeItem("tm_admin_token");
    localStorage.removeItem("tm_admin_name");
    window.location.href = "admin.html";
  },
  requireLogin() {
    if (!this.isLoggedIn()) window.location.href = "index.html";
  },
  requireAdmin() {
    if (!this.isAdmin()) window.location.href = "admin.html";
  },
};

// ---------- Small UI helpers shared across pages ----------
function showAlert(containerEl, message, type = "danger") {
  containerEl.innerHTML = `<div class="alert alert-${type} border-0" style="background:rgba(255,255,255,0.06); color:#F5F7FA;">${message}</div>`;
}

function setButtonLoading(btn, loading, loadingText = "Working") {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${loadingText}<span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
  }
}

function currency(n) {
  if (n === null || n === undefined) return "₹0";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function renderNavbarUser() {
  const slot = document.getElementById("navUserSlot");
  if (!slot) return;
  if (Auth.isLoggedIn()) {
    slot.innerHTML = `
      <span class="text-mist small me-2 d-none d-md-inline">Hi, ${Auth.userName()}</span>
      <a href="dashboard.html" class="btn btn-tm-ghost btn-sm me-2">Dashboard</a>
      <button class="btn btn-tm-ghost btn-sm" onclick="Auth.logout()">Log out</button>
    `;
  } else {
    slot.innerHTML = `<a href="index.html#auth" class="btn btn-tm-primary btn-sm">Log in</a>`;
  }
}
document.addEventListener("DOMContentLoaded", renderNavbarUser);
