(function () {
  const root = document.documentElement;
  const cards = Array.from(document.querySelectorAll(".artifact-card, .glass-card, .prediction-card, .stack-layer, .diagram-card"));
  const DOMAIN_RULES = [
    {
      id: "billing",
      label: "Billing / money movement",
      keywords: ["payment", "checkout", "refund", "invoice", "charge", "billing", "subscription"],
      risk: 3,
      route: "finance-review",
      allowedActions: ["Require staged rollout", "Notify finance owner", "Log rollback plan"],
      blockedActions: ["Direct production launch without review"],
    },
    {
      id: "auth",
      label: "Authentication / access control",
      keywords: ["login", "password", "token", "session", "mfa", "auth", "permission", "admin"],
      risk: 3,
      route: "security-review",
      allowedActions: ["Require security review", "Add canary deployment", "Capture authentication metrics"],
      blockedActions: ["Disable auth checks for speed"],
    },
    {
      id: "data",
      label: "Sensitive data / export",
      keywords: ["export", "personal", "customer records", "vendor", "pii", "delete", "email", "gdpr", "privacy"],
      risk: 4,
      route: "privacy-review",
      allowedActions: ["Trigger privacy approval", "Verify retention policy", "Document data recipient"],
      blockedActions: ["Ship before privacy sign-off"],
    },
    {
      id: "performance",
      label: "Performance / reliability",
      keywords: ["latency", "load", "throughput", "timeout", "cpu", "memory", "incident", "downtime"],
      risk: 2,
      route: "reliability-review",
      allowedActions: ["Run load test", "Set alert thresholds", "Prepare rollback switch"],
      blockedActions: ["Merge without rollback path"],
    },
    {
      id: "content",
      label: "Content / low-risk UX copy",
      keywords: ["copy", "landing", "onboarding", "tutorial", "faq", "text", "content", "messaging"],
      risk: 1,
      route: "light-review",
      allowedActions: ["Self-serve launch", "Preview in staging", "Run content QA"],
      blockedActions: ["None"],
    },
  ];

  const POLICY_STEPS = ["intake", "score", "route", "risk-gate", "artifact-output"];

  function onScroll() {
    const y = window.scrollY || 0;
    root.style.setProperty("--scroll-shift", String(Math.min(y / 20, 36)));
  }

  function revealOnIntersect(entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  }

  const observer = new IntersectionObserver(revealOnIntersect, {
    threshold: 0.12,
  });

  cards.forEach(function (card, index) {
    card.style.transitionDelay = String(index * 35) + "ms";
    card.classList.add("pre-reveal");
    observer.observe(card);
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function tokenize(text) {
    return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  }

  function analyzePrototype(text) {
    const tokens = tokenize(text);
    const scoreCards = DOMAIN_RULES.map(function (rule) {
      let score = 0;
      const matches = [];
      rule.keywords.forEach(function (keyword) {
        const matched = keyword.includes(" ")
          ? text.toLowerCase().includes(keyword)
          : tokens.includes(keyword);
        if (matched) {
          score += keyword.includes(" ") ? 2 : 1;
          matches.push(keyword);
        }
      });
      return {
        id: rule.id,
        label: rule.label,
        route: rule.route,
        risk: rule.risk,
        allowedActions: rule.allowedActions,
        blockedActions: rule.blockedActions,
        score: score,
        matches: matches,
      };
    });

    scoreCards.sort(function (a, b) {
      return b.score - a.score || b.risk - a.risk;
    });

    const winner = scoreCards[0];
    const topScore = winner.score;
    const fallback = {
      id: "general",
      label: "General operational change",
      route: "manual-triage",
      risk: 2,
      score: 0,
      matches: [],
      allowedActions: ["Assign human triage owner", "Collect missing context"],
      blockedActions: ["Autonomous production launch"],
    };
    const chosen = topScore > 0 ? winner : fallback;
    const urgent = /\b(now|urgent|today|asap|friday|tonight)\b/i.test(text);
    const external = /\b(vendor|third party|partner)\b/i.test(text);
    const escalated = chosen.risk >= 3 || urgent || external;
    const riskTier = chosen.risk >= 4 ? "critical" : chosen.risk === 3 ? "high" : chosen.risk === 2 ? "medium" : "low";
    const policyRoute = escalated ? chosen.route : "self-serve";
    const pathId = [chosen.id, riskTier, escalated ? "escalate" : "self-serve"].join(":");
    const proof = [
      "Matched tokens: " + (chosen.matches.length ? chosen.matches.join(", ") : "none"),
      "Urgency flag: " + (urgent ? "on" : "off"),
      "External-party flag: " + (external ? "on" : "off"),
      "Policy route selected: " + policyRoute,
    ];

    return {
      chosen: chosen,
      scoreCards: scoreCards,
      urgent: urgent,
      external: external,
      escalated: escalated,
      riskTier: riskTier,
      policyRoute: policyRoute,
      proof: proof,
      pathId: pathId,
      summary: buildSummary(chosen, riskTier, policyRoute, escalated),
    };
  }

  function buildSummary(chosen, riskTier, policyRoute, escalated) {
    const routeText = {
      "finance-review": "Finance owner review before launch",
      "security-review": "Security review plus staged rollout",
      "privacy-review": "Privacy sign-off before any external movement",
      "reliability-review": "Reliability review with rollback readiness",
      "light-review": "Lightweight review in staging",
      "manual-triage": "Human triage required because the domain model is uncertain",
      "self-serve": "Self-serve launch permitted within guardrails",
    };
    return {
      title: chosen.label,
      riskText: riskTier.toUpperCase(),
      routeText: routeText[policyRoute] || policyRoute,
      escalationText: escalated ? "Escalation required" : "Escalation not required",
    };
  }

  function renderPrototype(result) {
    const scoreBars = document.getElementById("score-bars");
    const graphSteps = document.getElementById("graph-steps");
    const auditList = document.getElementById("audit-list");
    const artifactOutput = document.getElementById("artifact-output");
    const manifestOutput = document.getElementById("manifest-output");

    if (!scoreBars || !graphSteps || !auditList || !artifactOutput || !manifestOutput) {
      return;
    }

    scoreBars.innerHTML = result.scoreCards.map(function (card) {
      const width = Math.max(8, Math.min(card.score * 22, 100));
      return (
        '<div class="score-row">' +
          '<div class="score-label"><span>' + escapeHtml(card.label) + '</span><strong>' + card.score + '</strong></div>' +
          '<div class="bar"><i style="width: ' + width + '%"></i></div>' +
        '</div>'
      );
    }).join("");

    graphSteps.innerHTML = POLICY_STEPS.map(function (step, index) {
      const labels = {
        intake: "Request captured and tokenized",
        score: "Tiny domain model scored narrow routes",
        route: "Highest-confidence route selected",
        "risk-gate": result.escalated ? "Policy gate triggered escalation" : "Policy gate allowed self-serve path",
        "artifact-output": "Constrained artifact output compiled",
      };
      return (
        '<div class="graph-step active">' +
          '<div class="graph-dot"></div>' +
          '<div><strong>' + (index + 1) + ". " + escapeHtml(step) + '</strong><div>' + escapeHtml(labels[step]) + '</div></div>' +
        '</div>'
      );
    }).join("");

    auditList.innerHTML = result.proof.map(function (item) {
      return '<div class="audit-item">' + escapeHtml(item) + '</div>';
    }).join("");

    artifactOutput.innerHTML =
      '<div class="artifact-banner">' +
        '<strong>Compiled recommendation</strong>' +
        '<h4>' + escapeHtml(result.summary.title) + '</h4>' +
        '<p>' + escapeHtml(result.summary.routeText) + '. ' + escapeHtml(result.summary.escalationText) + '.</p>' +
      '</div>' +
      '<div class="artifact-grid">' +
        '<div class="artifact-cell"><strong>Risk tier</strong>' + escapeHtml(result.summary.riskText) + '</div>' +
        '<div class="artifact-cell"><strong>Route id</strong>' + escapeHtml(result.policyRoute) + '</div>' +
        '<div class="artifact-cell"><strong>Allowed actions</strong><div class="tag-row">' + result.chosen.allowedActions.map(function (action) {
          return '<span class="tag good">' + escapeHtml(action) + '</span>';
        }).join("") + '</div></div>' +
        '<div class="artifact-cell"><strong>Blocked actions</strong><div class="tag-row">' + result.chosen.blockedActions.map(function (action) {
          const klass = action === "None" ? "tag" : "tag stop";
          return '<span class="' + klass + '">' + escapeHtml(action) + '</span>';
        }).join("") + '</div></div>' +
      '</div>';

    manifestOutput.innerHTML =
      '<div class="manifest-item"><strong>artifact_path</strong><div>' + escapeHtml(result.pathId) + '</div></div>' +
      '<div class="manifest-item"><strong>domain_winner</strong><div>' + escapeHtml(result.chosen.id) + '</div></div>' +
      '<div class="manifest-item"><strong>evidence_count</strong><div>' + result.chosen.matches.length + '</div></div>' +
      '<div class="manifest-item"><strong>shell_mode</strong><div>constrained-output-only</div></div>';
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function initPrototype() {
    const input = document.getElementById("case-input");
    const runButton = document.getElementById("run-prototype");
    const clearButton = document.getElementById("clear-prototype");
    const sampleButtons = Array.from(document.querySelectorAll(".sample-chip"));
    if (!input || !runButton || !clearButton) {
      return;
    }

    function run() {
      const text = input.value.trim();
      if (!text) {
        renderPrototype(analyzePrototype("general landing page copy update"));
        return;
      }
      renderPrototype(analyzePrototype(text));
    }

    runButton.addEventListener("click", run);
    clearButton.addEventListener("click", function () {
      input.value = "";
      renderPrototype(analyzePrototype("general landing page copy update"));
    });
    sampleButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        input.value = button.getAttribute("data-sample") || "";
        run();
      });
    });

    run();
  }

  initPrototype();
})();
