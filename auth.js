document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("loginBtn");
      const alertBox = document.getElementById("loginAlert");
      alertBox.innerHTML = "";
      setButtonLoading(btn, true, "Logging in");
      try {
        const data = await apiRequest("/auth/login", {
          method: "POST",
          body: {
            email: document.getElementById("loginEmail").value.trim(),
            password: document.getElementById("loginPassword").value,
          },
        });
        Auth.setUser(data);
        window.location.href = "dashboard.html";
      } catch (err) {
        showAlert(alertBox, err.message);
      } finally {
        setButtonLoading(btn, false);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("registerBtn");
      const alertBox = document.getElementById("registerAlert");
      alertBox.innerHTML = "";
      setButtonLoading(btn, true, "Creating account");
      try {
        const data = await apiRequest("/auth/register", {
          method: "POST",
          body: {
            name: document.getElementById("regName").value.trim(),
            email: document.getElementById("regEmail").value.trim(),
            password: document.getElementById("regPassword").value,
            budget: 0,
            travelers: 1,
            preferences: { interests: [], food: "Any", travel_style: "Balanced", accommodation: "Budget" },
          },
        });
        Auth.setUser(data);
        window.location.href = "planner.html";
      } catch (err) {
        showAlert(alertBox, err.message);
      } finally {
        setButtonLoading(btn, false);
      }
    });
  }
});
