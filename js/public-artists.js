import { supabase } from "./supabase.js";
import { compareArtistsByDebutDate, escapeHtml, fallbackImage, formatDate } from "./utils.js";

const artistList = document.getElementById("publicArtistList");
const filterButtons = document.querySelectorAll("[data-artist-filter]");
let artistsCache = [];

function renderArtists(filter = "All") {
    const artists = filter === "All"
        ? artistsCache
        : artistsCache.filter((artist) => artist.artist_type === filter);

    if (!artists.length) {
        artistList.innerHTML = '<p class="empty-state">No artists match this category.</p>';
        return;
    }

    artistList.innerHTML = artists.map((artist) => `
        <article class="artist-card">
            <img src="${escapeHtml(artist.profile_image || fallbackImage())}"
                 alt="${escapeHtml(artist.name)}"
                 onerror="this.src='${fallbackImage()}'">
            <div class="artist-info">
                <h2>${escapeHtml(artist.name)}</h2>
                <span>${escapeHtml(artist.artist_type || "Artist")}</span>
                <p>${escapeHtml(formatDate(artist.debut_date, "Debut date not announced"))}</p>
                <a href="artist.html?slug=${encodeURIComponent(artist.slug)}" class="view-profile-btn">
                    View Profile
                </a>
            </div>
        </article>
    `).join("");
}

async function loadPublicArtists() {
    artistList.innerHTML = '<p class="loading-state">Loading artists...</p>';

    const { data, error } = await supabase
        .from("artists")
        .select("id,name,slug,artist_type,debut_date,profile_image,created_at")
        .order("name", { ascending: true });

    if (error) {
        console.error(error);
        artistList.innerHTML = '<p class="error-state">Failed to load artists. Please try again later.</p>';
        return;
    }

    artistsCache = [...(data || [])].sort(compareArtistsByDebutDate);
    renderArtists();
}

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        filterButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        renderArtists(button.dataset.artistFilter);
    });
});

await loadPublicArtists();
