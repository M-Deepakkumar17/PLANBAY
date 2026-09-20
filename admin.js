function showAdminDash() {
  document.getElementById("adminLoginView").classList.add("d-none");
  document.getElementById("adminDashView").classList.remove("d-none");
  document.getElementById("adminNavSlot").innerHTML = `
    <span class="text-mist small me-2 d-none d-md-inline">${localStorage.getItem("tm_admin_name") || "Admin"}</span>
    <button class="btn btn-tm-ghost btn-sm" onclick="Auth.adminLogout()">Log out</button>
  `;
  loadAdminData();
}

function showAdminLogin() {
  document.getElementById("adminLoginView").classList.remove("d-none");
  document.getElementById("adminDashView").classList.add("d-none");
}

async function loadAdminData() {
  try {
    const stats = await apiRequest("/admin/stats", { auth: true, isAdmin: true });
    document.getElementById("admStatUsers").textContent = stats.total_users;
    document.getElementById("admStatDest").textContent = stats.total_destinations;
    document.getElementById("admStatItn").textContent = stats.total_itineraries;
    document.getElementById("admStatFb").textContent = stats.total_feedback;

    const usersData = await apiRequest("/admin/users", { auth: true, isAdmin: true });
    document.getElementById("usersTableBody").innerHTML = usersData.users.length
      ? usersData.users.map((u) => `
          <tr>
            <td>${u.name}</td>
            <td class="text-mist">${u.email}</td>
            <td>${currency(u.budget)}</td>
            <td>${u.travelers}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4" class="text-mist text-center py-3">No users yet.</td></tr>`;

    const destData = await apiRequest("/recommend/destinations");
    document.getElementById("destList").innerHTML = destData.destinations.map((d) => `
      <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom: 1px solid var(--line);">
        <div>
          <div class="fw-medium small">${d.destination}</div>
          <div class="text-mist" style="font-size:0.75rem;">${(d.categories || []).join(", ")}</div>
        </div>
        <button class="btn btn-tm-ghost btn-sm delete-dest-btn" data-name="${d.destination}">Delete</button>
      </div>
    `).join("");

    document.querySelectorAll(".delete-dest-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm(`Delete "${btn.dataset.name}"?`)) return;
        try {
          await apiRequest(`/admin/destinations/${encodeURIComponent(btn.dataset.name)}`, {
            method: "DELETE", auth: true, isAdmin: true,
          });
          loadAdminData();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    if (err.message.includes("401") || err.message.toLowerCase().includes("token")) {
      Auth.adminLogout();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (Auth.isAdmin()) showAdminDash();
  else showAdminLogin();

  document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("adminLoginBtn");
    const alertBox = document.getElementById("adminLoginAlert");
    alertBox.innerHTML = "";
    setButtonLoading(btn, true, "Logging in");
    try {
      const data = await apiRequest("/auth/admin-login", {
        method: "POST",
        body: {
          email: document.getElementById("adminEmail").value.trim(),
          password: document.getElementById("adminPassword").value,
        },
      });
      Auth.setAdmin(data);
      showAdminDash();
    } catch (err) {
      showAlert(alertBox, err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });

  document.getElementById("addDestForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("addDestBtn");
    const alertBox = document.getElementById("addDestAlert");
    alertBox.innerHTML = "";
    setButtonLoading(btn, true, "Adding");
    try {
      const payload = {
        destination: document.getElementById("dName").value.trim(),
        state: document.getElementById("dState").value.trim(),
        categories: document.getElementById("dCategories").value.split(",").map(s => s.trim()).filter(Boolean),
        budget_level: "Medium",
        average_daily_cost: parseFloat(document.getElementById("dCost").value),
        minimum_days: parseInt(document.getElementById("dMinDays").value, 10),
        best_months: document.getElementById("dMonths").value.split(",").map(s => s.trim()).filter(Boolean),
        activities: document.getElementById("dActivities").value.split(",").map(s => s.trim()).filter(Boolean),
        food: [],
        travel_style: "Balanced",
        rating: 4.5,
      };
      await apiRequest("/admin/destinations", { method: "POST", body: payload, auth: true, isAdmin: true });
      showAlert(alertBox, "Destination added!", "success");
      document.getElementById("addDestForm").reset();
      loadAdminData();
    } catch (err) {
      showAlert(alertBox, err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });
});
