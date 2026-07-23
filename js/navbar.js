const menuButtons = document.querySelectorAll(".menu-icon");

menuButtons.forEach((button) => {
    const nav = button.closest("nav");
    const links = nav?.querySelector(".nav-links");

    if (!links) return;

    button.addEventListener("click", () => {
        const open = links.classList.toggle("active");
        button.classList.toggle("active", open);
        button.setAttribute("aria-expanded", String(open));
        button.textContent = open ? "×" : "☰";
    });

    links.addEventListener("click", (event) => {
        if (!event.target.closest("a")) return;
        links.classList.remove("active");
        button.classList.remove("active");
        button.setAttribute("aria-expanded", "false");
        button.textContent = "☰";
    });
});
