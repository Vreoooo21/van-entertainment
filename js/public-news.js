import { supabase } from "./supabase.js";
import { escapeHtml, fallbackImage, formatDate } from "./utils.js";

const newsList = document.getElementById("publicNewsList");

async function loadNews() {
    const { data, error } = await supabase
        .from("news")
        .select("id,title,slug,summary,publish_date,cover_image")
        .eq("is_published", true)
        .order("publish_date", { ascending: false });

    if (error) {
        console.error(error);
        newsList.innerHTML = '<p class="error-state">Failed to load news.</p>';
        return;
    }

    if (!data?.length) {
        newsList.innerHTML = '<p class="empty-state">No published news yet.</p>';
        return;
    }

    newsList.innerHTML = data.map((item) => `
        <article class="news-card">
            <img src="${escapeHtml(item.cover_image || fallbackImage())}"
                 alt="${escapeHtml(item.title)}"
                 onerror="this.src='${fallbackImage()}'">
            <div class="news-card-body">
                <span>${escapeHtml(formatDate(item.publish_date, "Date not announced"))}</span>
                <h2>${escapeHtml(item.title)}</h2>
                <p>${escapeHtml(item.summary || "Read the latest announcement from VAN ENTERTAINMENT.")}</p>
                <a href="news-detail.html?slug=${encodeURIComponent(item.slug)}">Read More →</a>
            </div>
        </article>
    `).join("");
}

await loadNews();
