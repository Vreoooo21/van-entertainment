(() => {
    const toggle = document.getElementById("adminMobileToggle");
    const sidebar = document.getElementById("adminSidebar");
    const closeButton = document.getElementById("adminSidebarClose");
    const overlay = document.getElementById("adminSidebarOverlay");

    if (!toggle || !sidebar || !overlay) return;

    let lastFocusedElement = null;

    const setOpen = (open) => {
        sidebar.classList.toggle("is-open", open);
        document.body.classList.toggle("admin-nav-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close dashboard menu" : "Open dashboard menu");
        overlay.hidden = !open;

        requestAnimationFrame(() => {
            overlay.classList.toggle("is-visible", open);
        });

        if (open) {
            lastFocusedElement = document.activeElement;
            closeButton?.focus({ preventScroll: true });
        } else if (lastFocusedElement instanceof HTMLElement) {
            lastFocusedElement.focus({ preventScroll: true });
        }
    };

    toggle.addEventListener("click", () => setOpen(!sidebar.classList.contains("is-open")));
    closeButton?.addEventListener("click", () => setOpen(false));
    overlay.addEventListener("click", () => setOpen(false));

    sidebar.querySelectorAll("[data-admin-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            if (window.matchMedia("(max-width: 820px)").matches) setOpen(false);
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && sidebar.classList.contains("is-open")) setOpen(false);
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 820 && sidebar.classList.contains("is-open")) setOpen(false);
    });
})();
