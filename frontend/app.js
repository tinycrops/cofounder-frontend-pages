(function () {
  const cfg = window.CONFIG || {};
  const backendBase = (cfg.BACKEND_URL || "").replace(/\/$/, "");
  const healthEl = document.getElementById("health-status");
  const apiRespEl = document.getElementById("api-response");
  const form = document.getElementById("idea-form");

  function setHealth(msg, level) {
    healthEl.textContent = msg;
    healthEl.className = "status " + (level || "warn");
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...(options || {}), signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }

  async function checkHealth() {
    if (!backendBase) {
      setHealth("Backend URL not configured. Running in frontend-only fallback mode.", "warn");
      return;
    }
    try {
      const res = await fetchWithTimeout(backendBase + "/api/health", {}, 5000);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      setHealth("Backend reachable: " + JSON.stringify(data), "ok");
    } catch (err) {
      setHealth("Backend unavailable: " + String(err), "warn");
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const idea = document.getElementById("idea").value.trim();

    if (!backendBase) {
      const subject = encodeURIComponent("Cofounder Inquiry: " + (name || "New lead"));
      const body = encodeURIComponent("Name: " + name + "\nEmail: " + email + "\n\nIdea:\n" + idea);
      window.location.href = "mailto:mhendricks1290@gmail.com?subject=" + subject + "&body=" + body;
      return;
    }

    apiRespEl.textContent = "Submitting to API...";
    try {
      const res = await fetchWithTimeout(backendBase + "/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, idea: idea })
      }, 7000);

      const data = await res.json();
      apiRespEl.textContent = JSON.stringify(data, null, 2);
      if (res.ok) form.reset();
    } catch (err) {
      apiRespEl.textContent = "API unavailable. Error: " + String(err);
    }
  });

  checkHealth();
})();
