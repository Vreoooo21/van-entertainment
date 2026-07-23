import { supabase } from "./supabase.js";

/* =========================
   ELEMENTS
========================= */

const artistList = document.getElementById("artistList");
const loadingMessage = document.getElementById("loadingMessage");
const artistForm = document.getElementById("artistForm");
const artistFormSection = document.getElementById("artistFormSection");
const showFormBtn = document.getElementById("showFormBtn");
const cancelFormBtn = document.getElementById("cancelFormBtn");
const logoutBtn = document.getElementById("logoutBtn");
const formMessage = document.getElementById("formMessage");

const artistFormTitle = document.getElementById("artistFormTitle");
const saveArtistBtn = document.getElementById("saveArtistBtn");

/* =========================
   STATE
========================= */

let artistsCache = [];
let editingArtistId = null;
let existingProfileImage = null;

/* =========================
   AUTH PROTECTION
========================= */

async function protectDashboard() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        window.location.replace("admin-login.html");
        return false;
    }

    return true;
}

/* =========================
   HELPERS
========================= */

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function resetArtistForm() {
    artistForm.reset();

    editingArtistId = null;
    existingProfileImage = null;

    artistFormTitle.textContent = "Add New Artist";
    saveArtistBtn.textContent = "Save Artist";

    formMessage.textContent = "";
}

/* =========================
   LOAD ARTISTS
========================= */

async function loadArtists() {
    loadingMessage.textContent = "Loading artists...";
    artistList.innerHTML = "";

    const { data: artists, error } = await supabase
        .from("artists")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        loadingMessage.textContent =
            `Failed to load artists: ${error.message}`;
        return;
    }

    artistsCache = artists || [];
    loadingMessage.textContent = "";

    if (artistsCache.length === 0) {
        artistList.innerHTML =
            "<p>No artists have been added yet.</p>";
        return;
    }

    artistList.innerHTML = artistsCache
        .map((artist) => {
            const image =
                artist.profile_image || "images/logo.png";

            return `
                <article class="admin-artist-card">
                    <img
                        src="${escapeHtml(image)}"
                        alt="${escapeHtml(artist.name)}"
                        onerror="this.src='images/logo.png'"
                    >

                    <div class="admin-artist-content">
                        <h2>${escapeHtml(artist.name)}</h2>

                        <span>
                            ${escapeHtml(artist.artist_type)}
                        </span>

                        <div class="admin-artist-actions">
                            <button
                                type="button"
                                class="edit-artist-btn"
                                data-id="${artist.id}"
                            >
                                Edit
                            </button>

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
        })
        .join("");
}

/* =========================
   UPLOAD IMAGE
========================= */

async function uploadArtistImage(imageFile) {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const maximumSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(imageFile.type)) {
        throw new Error(
            "Gunakan gambar JPG, PNG, atau WebP."
        );
    }

    if (imageFile.size > maximumSize) {
        throw new Error(
            "Ukuran gambar maksimal 5 MB."
        );
    }

    const safeOriginalName = imageFile.name
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, "-");

    const uniqueFileName =
        `${crypto.randomUUID()}-${safeOriginalName}`;

    const filePath = `profiles/${uniqueFileName}`;

    const { error: uploadError } = await supabase
        .storage
        .from("artist-images")
        .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: false
        });

    if (uploadError) {
        throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase
        .storage
        .from("artist-images")
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
}

/* =========================
   SAVE / UPDATE ARTIST
========================= */

artistForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    saveArtistBtn.disabled = true;
    formMessage.textContent = "Saving...";

    try {
        const imageInput =
            document.getElementById("profileImageFile");

        const imageFile = imageInput?.files?.[0];

        // Saat edit, foto lama tetap dipakai
        // kalau owner tidak memilih foto baru.
        let profileImageUrl = existingProfileImage;

        if (imageFile) {
            formMessage.textContent = "Uploading image...";

            profileImageUrl =
                await uploadArtistImage(imageFile);
        }

        const artistName = document
            .getElementById("artistName")
            .value
            .trim();

        const artistSlug = document
            .getElementById("artistSlug")
            .value
            .trim()
            .toLowerCase();

        const artistType = document
            .getElementById("artistType")
            .value;

        if (!artistName || !artistSlug || !artistType) {
            throw new Error(
                "Name, slug, dan artist type wajib diisi."
            );
        }

        const artistData = {
            name: artistName,
            slug: artistSlug,
            artist_type: artistType,

            debut_date:
                document.getElementById("debutDate").value ||
                null,

            profile_image: profileImageUrl,

            description:
                document
                    .getElementById("artistDescription")
                    .value
                    .trim() || null,

            is_featured:
                document.getElementById("isFeatured").checked
        };

        formMessage.textContent = editingArtistId
            ? "Updating artist..."
            : "Saving artist...";

        let saveError = null;

        if (editingArtistId) {
            const { error } = await supabase
                .from("artists")
                .update(artistData)
                .eq("id", editingArtistId);

            saveError = error;
        } else {
            const { error } = await supabase
                .from("artists")
                .insert(artistData);

            saveError = error;
        }

        if (saveError) {
            throw new Error(saveError.message);
        }

        resetArtistForm();
        artistFormSection.hidden = true;

        await loadArtists();
    } catch (error) {
        console.error(error);

        formMessage.textContent =
            `Failed: ${error.message}`;
    } finally {
        saveArtistBtn.disabled = false;
    }
});

/* =========================
   EDIT / DELETE BUTTONS
========================= */

artistList.addEventListener("click", async (event) => {
    /* ---------- EDIT ---------- */

    const editButton =
        event.target.closest(".edit-artist-btn");

    if (editButton) {
        const artistId = String(editButton.dataset.id);

        const artist = artistsCache.find(
            (item) => String(item.id) === artistId
        );

        if (!artist) {
            alert("Artist data not found.");
            return;
        }

        editingArtistId = artist.id;
        existingProfileImage =
            artist.profile_image || null;

        document.getElementById("artistName").value =
            artist.name || "";

        document.getElementById("artistSlug").value =
            artist.slug || "";

        document.getElementById("artistType").value =
            artist.artist_type || "";

        document.getElementById("debutDate").value =
            artist.debut_date || "";

        document.getElementById(
            "artistDescription"
        ).value = artist.description || "";

        document.getElementById("isFeatured").checked =
            Boolean(artist.is_featured);

        const imageInput =
            document.getElementById("profileImageFile");

        if (imageInput) {
            imageInput.value = "";
        }

        artistFormTitle.textContent =
            `Edit ${artist.name}`;

        saveArtistBtn.textContent =
            "Update Artist";

        formMessage.textContent = "";
        artistFormSection.hidden = false;

        artistFormSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        return;
    }

    /* ---------- DELETE ---------- */

    const deleteButton =
        event.target.closest(".delete-artist-btn");

    if (!deleteButton) {
        return;
    }

    const artistId = deleteButton.dataset.id;
    const artistName = deleteButton.dataset.name;

    const confirmed = window.confirm(
        `Delete ${artistName} from the website?`
    );

    if (!confirmed) {
        return;
    }

    deleteButton.disabled = true;
    deleteButton.textContent = "Deleting...";

    const { error } = await supabase
        .from("artists")
        .delete()
        .eq("id", artistId);

    if (error) {
        alert(
            `Failed to delete artist: ${error.message}`
        );

        deleteButton.disabled = false;
        deleteButton.textContent = "Delete";
        return;
    }

    // Jika artis yang sedang diedit dihapus,
    // tutup dan reset form.
    if (String(editingArtistId) === String(artistId)) {
        resetArtistForm();
        artistFormSection.hidden = true;
    }

    await loadArtists();
});

/* =========================
   OPEN / CLOSE FORM
========================= */

showFormBtn.addEventListener("click", () => {
    resetArtistForm();

    artistFormSection.hidden = false;

    document.getElementById("artistName").focus();
});

cancelFormBtn.addEventListener("click", () => {
    resetArtistForm();
    artistFormSection.hidden = true;
});

/* =========================
   LOGOUT
========================= */

logoutBtn.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut({
        scope: "local"
    });

    if (error) {
        alert(error.message);
        return;
    }

    window.location.replace("admin-login.html");
});

/* =========================
   INITIALIZATION
========================= */

const authorized = await protectDashboard();

if (authorized) {
    await loadArtists();
}