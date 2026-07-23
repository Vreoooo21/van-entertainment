import { supabase } from "./supabase.js";
import {
    compareAlbumsByReleaseDate,
    compareMembersByBirthDate,
    compareVideosByReleaseDate,
    escapeHtml,
    fallbackImage,
    formatDate,
    formatMonthYear,
    safeExternalUrl,
    youtubeEmbedUrl
} from "./utils.js";

const loadingElement = document.getElementById("profileLoading");
const profileContent = document.getElementById("profileContent");
const profileError = document.getElementById("profileError");
const membersSection = document.getElementById("membersSection");
const memberList = document.getElementById("memberList");
const discographySection = document.getElementById("discographySection");
const albumList = document.getElementById("albumList");
const videosSection = document.getElementById("videosSection");
const videoList = document.getElementById("videoList");

function showError(message = "The artist profile could not be found.") {
    loadingElement.hidden = true;
    profileContent.hidden = true;
    profileError.hidden = false;
    document.getElementById("profileErrorText").textContent = message;
}

function renderMembers(members = []) {
    if (!members.length) {
        membersSection.hidden = true;
        return;
    }

    memberList.innerHTML = members.map((member) => `
        <article class="member-card">
            <img src="${escapeHtml(member.profile_image || fallbackImage())}"
                 alt="${escapeHtml(member.name)}"
                 onerror="this.src='${fallbackImage()}'">
            <div class="member-card-body">
                <h3>${escapeHtml(member.name)}</h3>
                <p>${escapeHtml(member.position || "Member")}</p>
                ${member.birth_date ? `<p class="member-birthday"><b>Birthday</b><span>${escapeHtml(formatDate(member.birth_date))}</span></p>` : ""}
                ${member.description ? `<small>${escapeHtml(member.description)}</small>` : ""}
            </div>
        </article>
    `).join("");

    membersSection.hidden = false;
}

function renderAlbums(albums = []) {
    if (!albums.length) {
        discographySection.hidden = true;
        return;
    }

    albumList.innerHTML = albums.map((album) => {
        const spotifyUrl = safeExternalUrl(album.spotify_url);
        return `
            <article class="album-card">
                <img src="${escapeHtml(album.cover_image || fallbackImage())}"
                     alt="${escapeHtml(album.title)}"
                     onerror="this.src='${fallbackImage()}'">
                <div class="album-card-body">
                    <h3>${escapeHtml(album.title)}</h3>
                    <span>${escapeHtml(album.album_type || "Release")}</span>
                    <p>${escapeHtml(formatMonthYear(album.release_date))}</p>
                    ${spotifyUrl ? `<a href="${escapeHtml(spotifyUrl)}" target="_blank" rel="noopener noreferrer">Listen →</a>` : ""}
                </div>
            </article>
        `;
    }).join("");

    discographySection.hidden = false;
}

function renderVideos(videos = []) {
    if (!videos.length) {
        videosSection.hidden = true;
        return;
    }

    videoList.innerHTML = videos.map((video) => {
        const embedUrl = youtubeEmbedUrl(video.youtube_url);
        const externalUrl = safeExternalUrl(video.youtube_url);

        return `
            <article class="video-card">
                ${embedUrl
                    ? `<iframe src="${embedUrl}" title="${escapeHtml(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
                    : `<img src="${escapeHtml(video.thumbnail_image || fallbackImage())}" alt="${escapeHtml(video.title)}" onerror="this.src='${fallbackImage()}'">`
                }
                <div class="video-card-body">
                    <h3>${escapeHtml(video.title)}</h3>
                    <p>${escapeHtml(formatMonthYear(video.release_date))}</p>
                    ${externalUrl ? `<a href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer">Watch on YouTube →</a>` : ""}
                </div>
            </article>
        `;
    }).join("");

    videosSection.hidden = false;
}

async function loadArtistProfile() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug")?.trim().toLowerCase();

    if (!slug) {
        window.location.replace("artists.html");
        return;
    }

    const { data: artist, error } = await supabase
        .from("artists")
        .select("id,name,slug,artist_type,debut_date,description,profile_image")
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        console.error(error);
        showError("Failed to load this artist profile.");
        return;
    }

    if (!artist) {
        showError();
        return;
    }

    document.title = `${artist.name} | VAN ENTERTAINMENT`;
    document.getElementById("artistProfileImage").src = artist.profile_image || fallbackImage();
    document.getElementById("artistProfileImage").alt = artist.name;
    document.getElementById("artistName").textContent = artist.name;
    document.getElementById("artistType").textContent = artist.artist_type || "Artist";
    document.getElementById("artistDebut").textContent = `Debut: ${formatDate(artist.debut_date)}`;
    document.getElementById("profileName").textContent = artist.name;
    document.getElementById("profileType").textContent = artist.artist_type || "Artist";
    document.getElementById("profileDebut").textContent = formatDate(artist.debut_date);
    document.getElementById("artistDescription").textContent = artist.description || "Artist description is not available yet.";

    const [membersResult, albumsResult, videosResult] = await Promise.all([
        supabase.from("members").select("*").eq("artist_id", artist.id).order("name", { ascending: true }),
        supabase.from("albums").select("*").eq("artist_id", artist.id).order("title", { ascending: true }),
        supabase.from("music_videos").select("*").eq("artist_id", artist.id).order("title", { ascending: true })
    ]);

    if (membersResult.error) console.warn("Members:", membersResult.error.message);
    if (albumsResult.error) console.warn("Albums:", albumsResult.error.message);
    if (videosResult.error) console.warn("Videos:", videosResult.error.message);

    renderMembers([...(membersResult.data || [])].sort(compareMembersByBirthDate));
    renderAlbums([...(albumsResult.data || [])].sort(compareAlbumsByReleaseDate));
    renderVideos([...(videosResult.data || [])].sort(compareVideosByReleaseDate));

    loadingElement.hidden = true;
    profileError.hidden = true;
    profileContent.hidden = false;
}

await loadArtistProfile();
