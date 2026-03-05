(function () {
  var cfg = window.CONFIG || {};
  var backendBase = (cfg.BACKEND_URL || "").replace(/\/$/, "");

  // ---- Scroll-triggered visibility ----
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".step, .cap-card, .price-card, .faq-item").forEach(function (el, i) {
    el.style.transitionDelay = (i % 4) * 0.08 + "s";
    observer.observe(el);
  });

  // ---- Live stats from backend ----
  function updateStats() {
    if (!backendBase) return;
    fetch(backendBase + "/api/stats", { signal: AbortSignal.timeout(5000) })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
      .then(function (data) {
        var map = {
          companies: data.total_companies || data.companies,
          tasks: data.tasks_completed,
          emails: data.emails_sent
        };
        Object.keys(map).forEach(function (key) {
          if (!map[key]) return;
          var el = document.querySelector('[data-stat="' + key + '"]');
          if (el) el.textContent = Number(map[key]).toLocaleString() + "+";
        });
      })
      .catch(function () {});
  }
  updateStats();

  // ---- Form submission ----
  var form = document.getElementById("idea-form");
  var respEl = document.getElementById("form-response");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("name").value.trim();
    var email = document.getElementById("email").value.trim();
    var idea = document.getElementById("idea").value.trim();

    if (!backendBase) {
      sendMailto(name, email, idea);
      return;
    }

    var btn = form.querySelector("button[type=submit]");
    btn.textContent = "Launching...";
    btn.disabled = true;

    fetch(backendBase + "/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, email: email, idea: idea }),
      signal: AbortSignal.timeout(15000)
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (result) {
        respEl.style.display = "block";
        if (result.ok) {
          respEl.className = "form-response success";
          respEl.textContent = "Your company is being created. AI agents are activating now.\n\n" + JSON.stringify(result.data, null, 2);
          form.reset();
        } else {
          respEl.className = "form-response error";
          respEl.textContent = "Server responded with an error:\n" + JSON.stringify(result.data, null, 2);
        }
      })
      .catch(function () {
        respEl.style.display = "block";
        respEl.className = "form-response error";
        respEl.innerHTML =
          "Backend unavailable. <a href=\"#\" id=\"mailto-fallback\" style=\"color:var(--accent);text-decoration:underline;\">Send via email instead</a>.";
        document.getElementById("mailto-fallback").addEventListener("click", function (ev) {
          ev.preventDefault();
          sendMailto(name, email, idea);
        });
      })
      .finally(function () {
        btn.textContent = "Launch my AI company";
        btn.disabled = false;
      });
  });

  function sendMailto(name, email, idea) {
    var subject = encodeURIComponent("Cofounder: " + (name || "New idea"));
    var body = encodeURIComponent("Name: " + name + "\nEmail: " + email + "\n\nIdea:\n" + idea);
    window.location.href = "mailto:mhendricks1290@gmail.com?subject=" + subject + "&body=" + body;
  }

  // ---- Smooth nav highlight ----
  var navCta = document.querySelector(".nav-cta");
  window.addEventListener("scroll", function () {
    if (window.scrollY > 100) {
      navCta.style.borderColor = "var(--accent)";
      navCta.style.color = "var(--accent)";
    } else {
      navCta.style.borderColor = "";
      navCta.style.color = "";
    }
  });
})();
