const MEDALS = ["🥇", "🥈", "🥉", "🏅", "🏅"];

function renderResults() {
  const grid = document.getElementById("resultsGrid");
  const alertBox = document.getElementById("resultsAlert");
  const raw = sessionStorage.getItem("tm_recommendations");
  const prefsRaw = sessionStorage.getItem("tm_prefs");

  if (!raw || !prefsRaw) {
    showAlert(alertBox, `No trip preferences found yet. <a href="planner.html">Go back and tell us what you're looking for</a>.`, "warning");
    return;
  }

  const results = JSON.parse(raw);
  const prefs = JSON.parse(prefsRaw);

  document.getElementById("prefsSummary").textContent =
    `${prefs.days} days · ${currency(prefs.budget)} · ${prefs.travelers} traveler(s) · ${prefs.interests.join(", ") || "open to anything"}`;

  if (!results.length) {
    showAlert(alertBox, "No matching destinations found. Try adjusting your budget or interests.", "warning");
    return;
  }

  grid.innerHTML = results.map((r, i) => `
    <div class="col-md-6 col-lg-4 fade-up delay-${Math.min(i, 4)}">
      <div class="glass glass-hover p-4 h-100 d-flex flex-column ${i === 0 ? "rank-1" : ""}">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <div class="text-mist small">${MEDALS[i] || "📍"} ${r.state || ""}</div>
            <h3 class="fw-bold mb-0">${r.destination}</h3>
          </div>
          <div class="text-end">
            <div class="match-badge">${r.match_score}%</div>
            <div class="text-mist small">match</div>
          </div>
        </div>
        <div class="d-flex flex-wrap gap-1 my-2">
          ${(r.categories || []).slice(0, 3).map(c => `<span class="badge-soft">${c}</span>`).join("")}
        </div>
        <div class="progress-tm my-2"><div style="width:${r.match_score}%"></div></div>
        <div class="text-mist small mb-3">Est. trip cost: <span class="text-paper fw-semibold">${currency(r.estimated_total_cost)}</span> · ⭐ ${r.rating ?? "—"}</div>
        <button class="btn btn-tm-primary mt-auto build-trip-btn"
          data-destination="${r.destination}" data-score="${r.match_score}">Build My Trip</button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll(".build-trip-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      setButtonLoading(btn, true, "Building itinerary");
      try {
        const data = await apiRequest("/itinerary/generate", {
          method: "POST",
          body: {
            user_id: Auth.userId() || "guest",
            destination: btn.dataset.destination,
            days: prefs.days,
            budget: prefs.budget,
            travelers: prefs.travelers,
            interests: prefs.interests,
            pace: prefs.pace,
            match_score: parseInt(btn.dataset.score, 10),
          },
        });
        sessionStorage.setItem("tm_itinerary", JSON.stringify(data));
        window.location.href = "itinerary.html";
      } catch (err) {
        showAlert(document.getElementById("resultsAlert"), err.message);
        setButtonLoading(btn, false);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", renderResults);
