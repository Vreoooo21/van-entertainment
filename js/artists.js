import { supabase } from "./supabase.js";

const artistList = document.getElementById("artistList");
const loadingMessage = document.getElementById("loadingMessage");
const artistForm = document.getElementById("artistForm");
const artistFormSection = document.getElementById("artistFormSection");
const showFormBtn = document.getElementById("showFormBtn");
const cancelFormBtn = document.getElementById("cancelFormBtn");
const logoutBtn = document.getElementById("logoutBtn");
const formMessage = document.getElementById("formMessage");

async function protectDashboard() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        window.location.replace("admin-login.html");
        return false;
    }

    return true;
}

function escapeHtml(value = "") {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadArtists() {
    loadingMessage.textContent = "Loading artists...";

    const { data: artists, error } = await supabase
        .from("artists")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        loadingMessage.textContent = `Failed to load artists: ${error.message}`;
        return;
    }

    loadingMessage.textContent = "";

    if (!artists || artists.length === 0) {
        artistList.innerHTML = "<p>No artists have been added yet.</p>";
        return;
    }

    artistList.innerHTML = artists.map((artist) => {
        const image = artist.profile_image
            ? escapeHtml(artist.profile_image)
            : "images/logo.png";

        return `
            <article class="admin-artist-card">
                <img
                    src="${image}"
                    alt="${escapeHtml(artist.name)}"
                    onerror="this.src='images/logo.png'"
                >

                <div class="admin-artist-content">
                    <h2>${escapeHtml(artist.name)}</h2>
                    <span>${escapeHtml(artist.artist_type)}</span>

                    <div class="admin-artist-actions">
                        <button
                            type="button"
                            class="delete-artist-btn"
                            data-id="${artist.id}"
                            data-name="${escapeHtml(artist.name)}"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

artistForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    formMessage.textContent = "Saving...";

    const imageInput =
        document.getElementById("profileImageFile");

    const imageFile = imageInput.files[0];

    let profileImageUrl = null;

    if (imageFile) {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        const maximumSize = 5 * 1024 * 1024;

        if (!allowedTypes.includes(imageFile.type)) {
            formMessage.textContent =
                "Gunakan gambar JPG, PNG, atau WebP.";
            return;
        }

        if (imageFile.size > maximumSize) {
            formMessage.textContent =
                "Ukuran gambar maksimal 5 MB.";
            return;
        }

        const safeOriginalName = imageFile.name
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, "-");

        const uniqueFileName =
            `${crypto.randomUUID()}-${safeOriginalName}`;

        const filePath = `profiles/${uniqueFileName}`;

        formMessage.textContent = "Uploading image...";

        const { error: uploadError } = await supabase
            .storage
            .from("artist-images")
            .upload(filePath, imageFile, {
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) {
            formMessage.textContent =
                `Upload failed: ${uploadError.message}`;
            return;
        }

        const { data: publicUrlData } = supabase
            .storage
            .from("artist-images")
            .getPublicUrl(filePath);

        profileImageUrl = publicUrlData.publicUrl;
    }

    const newArtist = {
        name: document
            .getElementById("artistName")
            .value
            .trim(),

        slug: document
            .getElementById("artistSlug")
            .value
            .trim()
            .toLowerCase(),

        artist_type:
            document.getElementById("artistType").value,

        debut_date:
            document.getElementById("debutDate").value || null,

        profile_image: profileImageUrl,

        description:
            document
                .getElementById("artistDescription")
                .value
                .trim() || null,

        is_featured:
            document.getElementById("isFeatured").checked
    };

    formMessage.textContent = "Saving artist...";

    const { error: insertError } = await supabase
        .from("artists")
        .insert(newArtist);

    if (insertError) {
        formMessage.textContent =
            `Failed: ${insertError.message}`;
        return;
    }

    artistForm.reset();
    artistFormSection.hidden = true;
    formMessage.textContent = "";

    await loadArtists();
});

artistList.addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-artist-btn");

    if (!button) return;

    const artistId = button.dataset.id;
    const artistName = button.dataset.name;

    const confirmed = window.confirm(
        `Delete ${artistName} from the website?`
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "Deleting...";

    const { error } = await supabase
        .from("artists")
        .delete()
        .eq("id", artistId);

    if (error) {
        alert(`Failed to delete artist: ${error.message}`);
        button.disabled = false;
        button.textContent = "Delete";
        return;
    }

    await loadArtists();
});

showFormBtn.addEventListener("click", () => {
    artistFormSection.hidden = false;
    document.getElementById("artistName").focus();
});

cancelFormBtn.addEventListener("click", () => {
    artistForm.reset();
    formMessage.textContent = "";
    artistFormSection.hidden = true;
});

logoutBtn.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        alert(error.message);
        return;
    }

    window.location.replace("admin-login.html");
});

const authorized = await protectDashboard();

if (authorized) {
    await loadArtists();
}