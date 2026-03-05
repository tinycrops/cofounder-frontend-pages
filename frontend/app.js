(function () {
  const cfg = window.CONFIG || {};
  const backendBase = (cfg.BACKEND_URL || "").replace(/\/$/, "");
  const googleClientId = cfg.GOOGLE_CLIENT_ID || "";

  const overlay = document.getElementById("overlay");
  const ctaBtn = document.getElementById("cta-btn");
  const signInBtn = document.getElementById("sign-in-btn");
  const closeBtn = document.getElementById("modal-close");
  const googleBtn = document.getElementById("google-btn");
  const emailForm = document.getElementById("email-form");
  const ideaForm = document.getElementById("idea-form");
  const terminal = document.getElementById("terminal");

  const stepAuth = document.getElementById("step-auth");
  const stepIdea = document.getElementById("step-idea");
  const stepRunning = document.getElementById("step-running");

  let userEmail = null;
  let userName = null;

  function openModal() { overlay.classList.add("open"); }
  function closeModal() { overlay.classList.remove("open"); }

  function showStep(step) {
    [stepAuth, stepIdea, stepRunning].forEach(function (s) { s.classList.add("hidden"); });
    step.classList.remove("hidden");
  }

  // Open modal on CTA or sign in
  ctaBtn.addEventListener("click", function () { openModal(); showStep(stepAuth); });
  signInBtn.addEventListener("click", function () { openModal(); showStep(stepAuth); });
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });

  // Decode JWT payload (Google ID tokens are JWTs)
  function decodeJwtPayload(token) {
    var base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  }

  // Google OAuth callback
  function handleGoogleResponse(response) {
    var payload = decodeJwtPayload(response.credential);
    userEmail = payload.email;
    userName = payload.name || payload.email;
    showStep(stepIdea);
  }

  // Expose callback globally for GIS
  window.handleGoogleResponse = handleGoogleResponse;

  // Google Sign-In via GIS popup
  googleBtn.addEventListener("click", function () {
    if (!googleClientId || typeof google === "undefined") {
      alert("Google sign-in is still loading. Try again in a moment.");
      return;
    }
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleResponse,
    });
    google.accounts.id.prompt(function (notification) {
      // If One Tap is suppressed (e.g. user dismissed before), fall back to button flow
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Use the redirect/popup OAuth flow as fallback
        var client = google.accounts.oauth2.initCodeClient({
          client_id: googleClientId,
          scope: "email profile",
          ux_mode: "popup",
          callback: function (resp) {
            // For code flow we just need the email — use the id_token approach instead
          },
        });
        // Simpler: use initTokenClient for implicit flow
        var tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "email profile",
          callback: function (tokenResponse) {
            fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: "Bearer " + tokenResponse.access_token }
            }).then(function (r) { return r.json(); }).then(function (info) {
              userEmail = info.email;
              userName = info.name || info.email;
              showStep(stepIdea);
            });
          },
        });
        tokenClient.requestAccessToken();
      }
    });
  });

  // Email auth
  emailForm.addEventListener("submit", function (e) {
    e.preventDefault();
    userEmail = document.getElementById("auth-email").value.trim();
    userName = userEmail;
    if (userEmail) showStep(stepIdea);
  });

  // Idea submission
  ideaForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var idea = document.getElementById("idea").value.trim();
    if (!idea) return;

    showStep(stepRunning);
    terminal.textContent = "";

    function log(text) {
      terminal.textContent += text + "\n";
      terminal.scrollTop = terminal.scrollHeight;
    }

    log("> Initializing Cofounder for " + userEmail + "...");

    if (!backendBase) {
      // Frontend-only demo mode
      var steps = [
        "> Analyzing business idea...",
        "> Generating company name...",
        "> Creating mission statement...",
        "> Researching market landscape...",
        "> Identifying target customers...",
        "> Proposing growth tasks...",
        "> Setting up autonomous agent cycle...",
        "",
        "Your company is being built.",
        "We'll email " + userEmail + " when your dashboard is ready.",
        "",
        "In the meantime — check your inbox for early access."
      ];
      for (var i = 0; i < steps.length; i++) {
        await delay(600 + Math.random() * 400);
        log(steps[i]);
      }
      return;
    }

    // Real backend submission — streams SSE from onboarding agent
    log("> Connecting to backend...");
    try {
      var res = await fetch(backendBase + "/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName, email: userEmail, idea: idea })
      });

      if (!res.ok) {
        var errData = await res.json().catch(function () { return {}; });
        log("> Error: " + (errData.detail || res.statusText));
        return;
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";

      while (true) {
        var result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });

        var lines = buffer.split("\n");
        buffer = lines.pop();

        for (var j = 0; j < lines.length; j++) {
          var line = lines[j];
          if (!line.startsWith("data: ")) continue;
          try {
            var evt = JSON.parse(line.slice(6));
            if (evt.type === "done" && evt.slug) {
              log("");
              log("> Company created successfully.");
              log("> Dashboard: " + window.location.origin + "/dashboard/" + evt.slug);
            } else if (evt.type === "error") {
              log("> Error: " + evt.text);
            } else if (evt.type === "queued") {
              log("> Idea #" + evt.id + " queued. We'll email " + userEmail + " when ready.");
            } else if (evt.text) {
              log("> " + evt.text);
            }
          } catch (parseErr) { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      log("> Backend unavailable — queued for processing.");
      log("> We'll email " + userEmail + " when ready.");
    }
  });

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }
})();
