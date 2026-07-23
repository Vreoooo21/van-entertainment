import { supabase } from "./supabase.js";
import { escapeHtml, fallbackImage, formatMonthYear } from "./utils.js";

const featuredList = document.getElementById("featuredArtistList");
const latestNewsList = document.getElementById("latestNewsList");
const artistCount = document.getElementById("artistCount");

async function loadFeaturedArtists() {
    if (!featuredList) return;

    const { data, error } = await supabase
        .from("artists")
        .select("id,name,slug,artist_type,debut_date,profile_image")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(3);

    if (error) {
        console.error("Featured artists:", error);
        featuredList.innerHTML = '<p class="empty-state">Featured artists will appear here.</p>';
        return;
    }

    if (!data?.length) {
        featuredList.innerHTML = '<p class="empty-state">Featured artists will appear here.</p>';
        return;
    }

    featuredList.innerHTML = data.map((artist) => `
        <article class="artist-card">
            <img src="${escapeHtml(artist.profile_image || fallbackImage())}"
                 alt="${escapeHtml(artist.name)}"
                 onerror="this.src='${fallbackImage()}'">
            <div class="artist-info">
                <h3>${escapeHtml(artist.name)}</h3>
                <span>${escapeHtml(artist.artist_type || "Artist")}</span>
                <p>${escapeHtml(formatMonthYear(artist.debut_date, "Debut coming soon"))}</p>
                <a href="artist.html?slug=${encodeURIComponent(artist.slug)}">View Profile →</a>
            </div>
        </article>
    `).join("");
}

async function loadLatestNews() {
    if (!latestNewsList) return;

    const { data, error } = await supabase
        .from("news")
        .select("id,title,slug,summary,publish_date,cover_image")
        .eq("is_published", true)
        .order("publish_date", { ascending: false })
        .limit(3);

    if (error) {
        console.error("Latest news:", error);
        latestNewsList.innerHTML = '<p class="empty-state">Latest announcements will appear here.</p>';
        return;
    }

    if (!data?.length) {
        latestNewsList.innerHTML = '<p class="empty-state">Latest announcements will appear here.</p>';
        return;
    }

    latestNewsList.innerHTML = data.map((news) => `
        <article class="news-card">
            <img src="${escapeHtml(news.cover_image || fallbackImage())}"
                 alt="${escapeHtml(news.title)}"
                 onerror="this.src='${fallbackImage()}'">
            <div class="news-card-body">
                <span>${escapeHtml(formatMonthYear(news.publish_date))}</span>
                <h3>${escapeHtml(news.title)}</h3>
                <p>${escapeHtml(news.summary || "Read the latest announcement from VAN ENTERTAINMENT.")}</p>
                <a href="news-detail.html?slug=${encodeURIComponent(news.slug)}">Read More →</a>
            </div>
        </article>
    `).join("");
}

async function loadStats() {
    if (!artistCount) return;

    const { count, error } = await supabase
        .from("artists")
        .select("id", { count: "exact", head: true });

    if (!error && Number.isFinite(count)) {
        artistCount.textContent = String(count);
    }
}

await Promise.allSettled([
    loadFeaturedArtists(),
    loadLatestNews(),
    loadStats()
]);
