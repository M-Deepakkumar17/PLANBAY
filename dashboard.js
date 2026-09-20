const PERSONALITY_ICONS = {
  Nature: "🌿", Adventure: "🧗", Beach: "🏖️", Heritage: "🏛️", Culture: "🎭",
  Wildlife: "🐘", Nightlife: "🌃", Romantic: "💕", Spiritual: "🙏",
  History: "📜", "Hill Station": "⛰️", Family: "👨‍👩‍👧",
};

async function loadDashboard() {
  Auth.requireLogin();
  const alertBox = document.getElementById("dashAlert");

  try {
    const data = await apiRequest(`/users/${Auth.userId()}/dashboard`);

    document.getElementById("welcomeBlock").querySelector("h1").textContent = `Welcome back, ${data.user.name} 👋`;
    document.getElementById("statTrips").textContent = data.trips_planned;
    document.getElementById("statDestinations").textContent = data.destinations_count;
    document.getElementById("statMatch").textContent = `${data.avg_ai_match}%`;

    const personalityEntries = Object.entries(data.travel_personality || {})
      .sort((a, b) => b[1] - a[1]);

    if (personalityEntries.length) {
      document.getElementById("personalityList").innerHTML = personalityEntries.map(([cat, pct]) => `
        <div class="mb-3">
          <div class="d-flex justify-content-between small mb-1">
            <span>${PERSONALITY_ICONS[cat] || "✨"} ${cat}</span>
            <span class="text-mist">${pct}%</span>
          </div>
          <div class="progress-tm"><div style="width:${pct}%"></div></div>
        </div>
      `).join("");
    }

    const trips = data.recent_trips || [];
    if (!trips.length) {
      document.getElementById("recentTrips").innerHTML = `
        <div class="text-center py-5">
          <div class="fs-1 mb-2">🧳</div>
          <p class="text-mist">No trips yet — your next journey is one click away.</p>
          <a href="planner.html" class="btn btn-tm-primary mt-2">Plan your first trip</a>
        </div>`;
    } else {
      document.getElementById("recentTrips").innerHTML = trips.slice().reverse().map((t) => `
        <div class="d-flex justify-content-between align-items-center glass p-3 mb-3">
          <div>
            <div class="fw-semibold">${t.destination}</div>
            <div class="text-mist small">${t.days} days · ${t.travelers} traveler(s) · ${currency(t.estimated_cost)}</div>
          </div>
          <span class="badge-soft">${t.match_score != null ? t.match_score + "% match" : "Saved"}</span>
        </div>
      `).join("");
    }
  } catch (err) {
    showAlert(alertBox, err.message);
  }
}

document.addEventListener("DOMContentLoaded", loadDashboard);
