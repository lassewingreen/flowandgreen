document.addEventListener("DOMContentLoaded", () => {
  // --- NAV + ANCHORS ---
  const btn = document.querySelector("#menu-btn");
  const menu = document.querySelector("#mobile-menu");
  const header = document.querySelector(".site-header");

  // Sæt top-afstand for IG-knap = headerhøjde + evt. åben mobilmenu
  function setFabOffset() {
    const headerH = header ? header.getBoundingClientRect().height : 64;
    const menuH =
      menu && !menu.classList.contains("hidden")
        ? menu.getBoundingClientRect().height
        : 0;
    const total = headerH + menuH;
    document.documentElement.style.setProperty("--header-h", total + "px");
  }

  // Burger toggle
  if (btn && menu) {
    btn.addEventListener("click", () => {
      menu.classList.toggle("hidden");
      // Vent til layout er opdateret før vi måler
      requestAnimationFrame(setFabOffset);
    });
  }

  // Smooth anchor scroll
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href && href.length > 1) {
        const el = document.querySelector(href);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth" });
        }
        if (menu) menu.classList.add("hidden");
        setFabOffset();
      }
    });
  });

  // Solid header baggrund på scroll for bedre kontrast
  const solid = () => {
    if (!header) return;
    const y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle("bg-ink/60", y > 8);
  };
  solid();
  window.addEventListener("scroll", solid, { passive: true });

  // --- REVEAL ON SCROLL (respekterer reduced motion) ---
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (!prefersReduced && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  } else {
    document
      .querySelectorAll(".reveal")
      .forEach((el) => el.classList.add("is-visible"));
  }

  // --- HERO SLIDER ---
  const slider = document.getElementById("hero-slider");
  if (slider) {
    const slides = Array.from(slider.querySelectorAll(".slide"));
    const dotsEl = slider.querySelector(".slider-dots");
    const prevBtn = slider.querySelector(".slider-prev");
    const nextBtn = slider.querySelector(".slider-next");

    let index = 0;
    let timer = null;
    const delay = parseInt(slider.getAttribute("data-autoplay") || "5000", 10);

    function setActive(i) {
      slides.forEach((s, idx) => {
        s.classList.toggle("is-active", idx === i);
        s.style.opacity = idx === i ? "1" : "0";
        s.style.transform = idx === i ? "scale(1)" : "scale(1.01)";
        s.style.transition = "opacity 700ms ease, transform 700ms ease";
        s.style.position = "absolute";
        s.style.inset = "0";
      });
      if (dotsEl) {
        dotsEl.querySelectorAll("button").forEach((d, di) => {
          d.className =
            di === i
              ? "h-2.5 w-2.5 rounded-full bg-white"
              : "h-2.5 w-2.5 rounded-full bg-white/50 hover:bg-white/70";
        });
      }
    }

    function go(dir) {
      index = (index + dir + slides.length) % slides.length;
      setActive(index);
      restart();
    }

    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => go(1), delay);
    }

    // Pause/play på hover/focus
    function pause() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function play() {
      if (!timer) {
        timer = setInterval(() => go(1), delay);
      }
    }
    slider.addEventListener("mouseenter", pause);
    slider.addEventListener("mouseleave", play);
    slider.addEventListener("focusin", pause);
    slider.addEventListener("focusout", play);

    // Tastatur-navigation
    slider.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    });

    // Dots (pagination)
    if (dotsEl) {
      slides.forEach((_, i) => {
        const b = document.createElement("button");
        b.setAttribute("aria-label", "Slide " + (i + 1));
        b.className = "h-2.5 w-2.5 rounded-full bg-white/50 hover:bg-white/70";
        b.addEventListener("click", () => {
          index = i;
          setActive(index);
          restart();
        });
        dotsEl.appendChild(b);
      });
    }

    // Knapper
    if (prevBtn) prevBtn.addEventListener("click", () => go(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => go(1));

    // Init slider
    setActive(index);
    restart();
  }

  // --- VIDEO: "VIS ALLE VIDEOER" (music section) ---
  (function initMusicVideosToggle() {
    const container = document.getElementById("music-videos");
    const overlay = document.getElementById("music-videos-overlay");
    const button = document.getElementById("music-videos-toggle");
    const inner = container
      ? container.querySelector("[data-videos-inner]")
      : null;

    if (!container || !overlay || !button || !inner) return;
    if (container.dataset.toggleInit === "1") return;
    container.dataset.toggleInit = "1";

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const PEEK_PX = 152;
    const ROWS_VISIBLE = 1;

    const labelEl = button.querySelector("[data-label]");
    const chevEl = button.querySelector("[data-chevron]");

    // Gem original overlay classes så vi kan restore dem
    const overlayOriginalClass = overlay.className;

    function getColsCount() {
      const style = window.getComputedStyle(inner);
      const tpl = (style.gridTemplateColumns || "").trim();
      if (!tpl) return 1;
      return Math.max(1, tpl.split(" ").filter(Boolean).length);
    }

    function setCollapsedHeight() {
      if (container.dataset.expanded === "1") return;

      const items = Array.from(inner.children);
      if (!items.length) return;

      const cols = getColsCount();
      const lastIndex = Math.min(items.length - 1, cols * ROWS_VISIBLE - 1);
      const last = items[lastIndex];

      const h = Math.max(
        240,
        Math.round(last.offsetTop + last.offsetHeight + PEEK_PX)
      );
      container.style.maxHeight = h + "px";
    }

    function setOverlayCollapsed() {
      // tilbage til veil/gradient overlay der ligger ovenpå grid
      overlay.className = overlayOriginalClass;
      overlay.style.background = ""; // brug Tailwind-klasserne igen
    }

    function setOverlayExpanded() {
      // overlay skal IKKE ligge ovenpå de sidste videoer i expanded state
      // Vi gør den "normal" i flowet under grid'et, og fjerner gradienten.
      overlay.className =
        "pointer-events-none mt-4 flex items-center justify-center";
      overlay.style.background = "transparent";
    }

    function getExpandedMaxHeight() {
      // Når overlay ligger i flow (expanded), skal maxHeight inkludere både grid + overlay
      return inner.scrollHeight + overlay.scrollHeight;
    }

    function expandToFullHeight() {
      // først: overlay ned under grid’et
      setOverlayExpanded();

      // så: maxHeight så alt kan være der
      const h = getExpandedMaxHeight();
      container.style.maxHeight = h + "px";

      // iframes kan ændre højde efter load
      requestAnimationFrame(() => {
        container.style.maxHeight = getExpandedMaxHeight() + "px";
      });
      setTimeout(() => {
        container.style.maxHeight = getExpandedMaxHeight() + "px";
      }, 300);
    }

    function setExpandedUI(isExpanded) {
      button.setAttribute("aria-expanded", isExpanded ? "true" : "false");

      if (labelEl)
        labelEl.textContent = isExpanded ? "Skjul videoer" : "Vis alle videoer";

      if (chevEl) {
        chevEl.style.transform = isExpanded ? "rotate(180deg)" : "rotate(0deg)";
        chevEl.style.transition = prefersReducedMotion
          ? "none"
          : "transform 200ms ease";
      }
    }

    // init state
    container.dataset.expanded = "0";
    setOverlayCollapsed();
    setCollapsedHeight();
    requestAnimationFrame(setCollapsedHeight);
    window.addEventListener("load", setCollapsedHeight, { once: true });
    window.addEventListener(
      "resize",
      () => {
        if (container.dataset.expanded === "1") {
          // hold korrekt højde i expanded state
          container.style.maxHeight = getExpandedMaxHeight() + "px";
        } else {
          setCollapsedHeight();
        }
      },
      { passive: true }
    );

    setExpandedUI(false);

    button.addEventListener("click", () => {
      const isExpanded = container.dataset.expanded === "1";

      if (!isExpanded) {
        container.dataset.expanded = "1";
        expandToFullHeight();
        setExpandedUI(true);
      } else {
        container.dataset.expanded = "0";

        // tilbage til overlay/veil ovenpå grid’et
        setOverlayCollapsed();

        // sæt collapsed height igen
        setCollapsedHeight();
        setExpandedUI(false);

        // scroll lidt tilbage så man ikke føler man “mister” sektionen
        const top =
          container.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({
          top,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      }
    });
  })();

  // --- INIT OFFSETS ---
  setFabOffset();
  window.addEventListener("resize", setFabOffset, { passive: true });
  window.addEventListener("orientationchange", setFabOffset);
  window.addEventListener("load", setFabOffset);
});
