import { supabase } from "./supabase.js";

const artistList = document.getElementById("publicArtistList");

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDebutDate(dateValue) {
    if (!dateValue) {
        return "Debut date not announced";
    }

    return new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date(`${dateValue}T00:00:00`));
}

async function loadPublicArtists() {
    artistList.innerHTML = "<p>Loading artists...</p>";

    const { data: artists, error } = await supabase
        .from("artists")
        .select(`
            id,
            name,
            slug,
            artist_type,
            debut_date,
            description,
            profile_image
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);

        artistList.innerHTML = `
            <p>Failed to load artists. Please try again later.</p>
        `;
        return;
    }

    if (!artists || artists.length === 0) {
        artistList.innerHTML = `
            <p>No artists are available yet.</p>
        `;
        return;
    }

    artistList.innerHTML = artists.map((artist) => {
        const image = artist.profile_image || "images/logo.png";

        return `
            <article class="artist-card">
                <img
                    src="${escapeHtml(image)}"
                    alt="${escapeHtml(artist.name)}"
                    onerror="this.src='images/logo.png'"
                >

                <div class="artist-info">
                    <h2>${escapeHtml(artist.name)}</h2>

                    <span>
                        ${escapeHtml(artist.artist_type)}
                    </span>

                    <p>
                        ${escapeHtml(formatDebutDate(artist.debut_date))}
                    </p>

                    ${
                        artist.description
                            ? `<p>${escapeHtml(artist.description)}</p>`
                            : ""
                    }
                    <a
                      href="artist.html?slug=${encodeURIComponent(artist.slug)}"
                      class="view-profile-btn"
                    >
                       View Profile
                    </a>
                </div>
            </article>
        `;
    }).join("");
}

await loadPublicArtists();