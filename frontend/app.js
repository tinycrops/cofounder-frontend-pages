(function () {
  const root = document.documentElement;
  const cards = Array.from(document.querySelectorAll(".artifact-card, .glass-card, .prediction-card, .stack-layer, .diagram-card"));

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
})();
