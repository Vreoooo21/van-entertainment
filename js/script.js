import "./navbar.js";

const topButton = document.getElementById("topBtn");

if (topButton) {
    const updateTopButton = () => {
        topButton.classList.toggle("visible", window.scrollY > 450);
    };

    window.addEventListener("scroll", updateTopButton, { passive: true });
    updateTopButton();

    topButton.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

const loader = document.getElementById("loader");
if (loader) {
    window.addEventListener("load", () => {
        window.setTimeout(() => loader.classList.add("hidden"), 350);
    });
}

const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add("show");
        });
    },
    { threshold: 0.12 }
);

document.querySelectorAll(".fade").forEach((element) => observer.observe(element));
