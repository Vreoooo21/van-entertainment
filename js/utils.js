export function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function formatDate(value, fallback = "Not announced") {
    if (!value) return fallback;

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return fallback;

    return new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(date);
}

export function formatMonthYear(value, fallback = "Coming soon") {
    if (!value) return fallback;

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return fallback;

    return new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric"
    }).format(date);
}

export function slugify(value = "") {
    return String(value)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function safeExternalUrl(value = "") {
    if (!value) return "";

    try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) return "";
        return url.href;
    } catch {
        return "";
    }
}

export function getYouTubeId(value = "") {
    const safeUrl = safeExternalUrl(value);
    if (!safeUrl) return "";

    try {
        const url = new URL(safeUrl);
        const host = url.hostname.replace(/^www\./, "");

        if (host === "youtu.be") {
            return url.pathname.split("/").filter(Boolean)[0] || "";
        }

        if (host.endsWith("youtube.com")) {
            if (url.pathname === "/watch") {
                return url.searchParams.get("v") || "";
            }

            const parts = url.pathname.split("/").filter(Boolean);
            if (["shorts", "embed", "live"].includes(parts[0])) {
                return parts[1] || "";
            }
        }
    } catch {
        return "";
    }

    return "";
}

export function youtubeEmbedUrl(value = "") {
    const id = getYouTubeId(value);
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : "";
}

export function fallbackImage() {
    return "images/banner 1.png";
}
