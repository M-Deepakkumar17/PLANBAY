const INTERESTS = ["Nature", "Adventure", "Beach", "Heritage", "Culture", "Wildlife",
  "Nightlife", "Romantic", "Spiritual", "History", "Hill Station", "Family"];

let selectedInterests = new Set(["Nature", "Adventure"]);

function renderInterestPills() {
  const wrap = document.getElementById("interestPills");
  wrap.innerHTML = INTERESTS.map((i) => `
    <span class="pill-check ${selectedInterests.has(i) ? "active" : ""}" data-interest="${i}">
      ${selectedInterests.has(i) ? "☑" : "☐"} ${i}
    </span>
  `).join("");

  wrap.querySelectorAll(".pill-check").forEach((el) => {
    el.addEventListener("click", () => {
      const val = el.dataset.interest;
      if (selectedInterests.has(val)) selectedInterests.delete(val);
      else selectedInterests.add(val);
      renderInterestPills();
    });
  });
}

function readFormPreferences() {
  return {
    location: document.getElementById("location").value.trim() || "Unknown",
    destination_preference: "Surprise Me",
    days: parseInt(document.getElementById("days").value, 10),
    budget: parseFloat(document.getElementById("budget").value),
    travelers: parseInt(document.getElementById("travelers").value, 10),
    travel_type: document.getElementById("travelType").value,
    interests: Array.from(selectedInterests),
    activities: [],
    food: document.getElementById("food").value,
    accommodation: document.getElementById("accommodation").value,
    travel_month: document.getElementById("travelMonth").value || null,
    pace: document.getElementById("pace").value,
    user_id: Auth.userId() || null,
  };
}

async function submitRecommend(endpoint, btn) {
  const alertBox = document.getElementById("plannerAlert");
  alertBox.innerHTML = "";
  setButtonLoading(btn, true, "Matching destinations");
  try {
    const prefs = readFormPreferences();
    const data = await apiRequest(endpoint, { method: "POST", body: prefs });
    sessionStorage.setItem("tm_prefs", JSON.stringify(prefs));
    sessionStorage.setItem("tm_recommendations", JSON.stringify(data.recommendations));
    window.location.href = "recommendations.html";
  } catch (err) {
    showAlert(alertBox, err.message);
  } finally {
    setButtonLoading(btn, false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderInterestPills();

  document.getElementById("plannerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    submitRecommend("/recommend", document.getElementById("generateBtn"));
  });

  document.getElementById("surpriseBtn").addEventListener("click", () => {
    submitRecommend("/recommend/surprise-me", document.getElementById("surpriseBtn"));
  });
});
