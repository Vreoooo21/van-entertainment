import { supabase } from "./supabase.js";

const loadingElement =
    document.getElementById("profileLoading");

const profileContent =
    document.getElementById("profileContent");

const artistInfoSection =
    document.getElementById("artistInfoSection");

const errorElement =
    document.getElementById("profileError");

function formatDebutDate(dateValue) {
    if (!dateValue) {
        return "Not announced";
    }

    return new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date(`${dateValue}T00:00:00`));
}

function showError() {
    loadingElement.hidden = true;
    profileContent.hidden = true;
    artistInfoSection.hidden = true;
    errorElement.hidden = false;
}

async function loadArtistProfile() {
    const queryParameters =
        new URLSearchParams(window.location.search);

    const slug = queryParameters.get("slug")?.trim();

    if (!slug) {
        showError();
        return;
    }

    const { data: artist, error } = await supabase
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
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        console.error("Failed to load artist:", error);
        showError();
        return;
    }

    if (!artist) {
        showError();
        return;
    }

    const debutText =
        formatDebutDate(artist.debut_date);

    const artistImage =
        artist.profile_image || "images/logo.png";

    document.title =
        `${artist.name} | VAN ENTERTAINMENT`;

    const profileImageElement =
        document.getElementById("artistProfileImage");

    profileImageElement.src = artistImage;
    profileImageElement.alt = artist.name;

    profileImageElement.addEventListener(
        "error",
        () => {
            profileImageElement.src = "images/logo.png";
        },
        { once: true }
    );

    document.getElementById("artistName").textContent =
        artist.name;

    document.getElementById("artistType").textContent =
        artist.artist_type;

    document.getElementById("artistDebut").textContent =
        `Debut: ${debutText}`;

    document.getElementById("profileName").textContent =
        artist.name;

    document.getElementById("profileType").textContent =
        artist.artist_type;

    document.getElementById("profileDebut").textContent =
        debutText;

    document.getElementById(
        "artistDescription"
    ).textContent =
        artist.description ||
        "Artist description is not available yet.";

    loadingElement.hidden = true;
    errorElement.hidden = true;
    profileContent.hidden = false;
    artistInfoSection.hidden = false;
}

await loadArtistProfile();