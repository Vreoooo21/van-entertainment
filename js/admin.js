import { supabase } from "./supabase.js";
import { uploadImage, removeImages } from "./storage.js";
import { escapeHtml, fallbackImage, formatDate, slugify } from "./utils.js";

const byId = (id) => document.getElementById(id);

const state = {
    artists: [],
    members: [],
    albums: [],
    videos: [],
    news: [],
    editing: {
        artist: null,
        member: null,
        album: null,
        video: null,
        news: null
    }
};

function showMessage(element, message, type = "info") {
    element.textContent = message;
    element.dataset.type = type;
}

function clearMessage(element) {
    element.textContent = "";
    delete element.dataset.type;
}

function setButtonBusy(button, busy, busyText = "Saving...") {
    if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent.trim();
    button.disabled = busy;
    button.textContent = busy ? busyText : button.dataset.defaultText;
}

async function protectDashboard() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        window.location.replace("admin-login.html");
        return false;
    }

    const ownerEmail = byId("ownerEmail");
    if (ownerEmail) ownerEmail.textContent = data.session.user.email || "Owner";
    return true;
}

function activatePanel(panelName) {
    document.querySelectorAll("[data-admin-tab]").forEach((button) => {
        button.classList.toggle("active", button.dataset.adminTab === panelName);
    });

    document.querySelectorAll(".admin-panel").forEach((panel) => {
        panel.hidden = panel.id !== `panel-${panelName}`;
    });
}

document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => activatePanel(button.dataset.adminTab));
});

function artistOptions(selectedId = "") {
    const options = ['<option value="">Select artist</option>'];

    state.artists.forEach((artist) => {
        const selected = String(artist.id) === String(selectedId) ? " selected" : "";
        options.push(`<option value="${artist.id}"${selected}>${escapeHtml(artist.name)}</option>`);
    });

    return options.join("");
}

function refreshArtistSelects() {
    ["memberArtistId", "albumArtistId", "videoArtistId"].forEach((id) => {
        const select = byId(id);
        if (!select) return;
        const current = select.value;
        select.innerHTML = artistOptions(current);
    });
}

function artistName(artistId) {
    return state.artists.find((artist) => String(artist.id) === String(artistId))?.name || "Unknown Artist";
}

async function loadArtists() {
    const loading = byId("artistLoading");
    const list = byId("artistList");
    loading.textContent = "Loading artists...";

    const { data, error } = await supabase
        .from("artists")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        loading.textContent = `Failed to load artists: ${error.message}`;
        return;
    }

    state.artists = data || [];
    loading.textContent = "";
    refreshArtistSelects();

    if (!state.artists.length) {
        list.innerHTML = '<p class="admin-empty">No artists have been added yet.</p>';
        return;
    }

    list.innerHTML = state.artists.map((artist) => `
        <article class="admin-card">
            <img src="${escapeHtml(artist.profile_image || fallbackImage())}"
                 alt="${escapeHtml(artist.name)}"
                 onerror="this.src='${fallbackImage()}'">
            <div class="admin-card-body">
                <div class="admin-card-heading">
                    <div>
                        <h3>${escapeHtml(artist.name)}</h3>
                        <p>${escapeHtml(artist.artist_type || "Artist")}</p>
                    </div>
                    ${artist.is_featured ? '<span class="status-badge">Featured</span>' : ""}
                </div>
                <small>${escapeHtml(formatDate(artist.debut_date, "Debut not announced"))}</small>
                <div class="admin-card-actions">
                    <button type="button" class="secondary-btn" data-edit-artist="${artist.id}">Edit</button>
                    <button type="button" class="danger-btn" data-delete-artist="${artist.id}" data-name="${escapeHtml(artist.name)}">Delete</button>
                </div>
            </div>
        </article>
    `).join("");
}

function resetArtistForm() {
    byId("artistForm").reset();
    state.editing.artist = null;
    byId("artistFormTitle").textContent = "Add New Artist";
    byId("saveArtistBtn").textContent = "Save Artist";
    delete byId("saveArtistBtn").dataset.defaultText;
    clearMessage(byId("artistFormMessage"));
    delete byId("artistSlug").dataset.touched;
}

function openArtistForm(artist = null) {
    resetArtistForm();

    if (artist) {
        state.editing.artist = artist;
        byId("artistName").value = artist.name || "";
        byId("artistSlug").value = artist.slug || "";
        byId("artistType").value = artist.artist_type || "";
        byId("artistDebutDate").value = artist.debut_date || "";
        byId("artistDescription").value = artist.description || "";
        byId("artistFeatured").checked = Boolean(artist.is_featured);
        byId("artistFormTitle").textContent = `Edit ${artist.name}`;
        byId("saveArtistBtn").textContent = "Update Artist";
    }

    byId("artistFormSection").hidden = false;
    byId("artistFormSection").scrollIntoView({ behavior: "smooth", block: "start" });
    byId("artistName").focus();
}

byId("addArtistBtn").addEventListener("click", () => openArtistForm());
byId("cancelArtistBtn").addEventListener("click", () => {
    resetArtistForm();
    byId("artistFormSection").hidden = true;
});

byId("artistName").addEventListener("input", () => {
    if (!state.editing.artist && !byId("artistSlug").dataset.touched) {
        byId("artistSlug").value = slugify(byId("artistName").value);
    }
});
byId("artistSlug").addEventListener("input", () => {
    byId("artistSlug").dataset.touched = "true";
});

byId("artistForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = byId("artistFormMessage");
    const button = byId("saveArtistBtn");
    const current = state.editing.artist;
    const file = byId("artistImageFile").files[0];
    let uploaded = null;

    setButtonBusy(button, true, current ? "Updating..." : "Saving...");
    showMessage(message, file ? "Uploading image..." : "Saving artist...");

    try {
        if (file) uploaded = await uploadImage(file, "artists");

        const payload = {
            name: byId("artistName").value.trim(),
            slug: slugify(byId("artistSlug").value),
            artist_type: byId("artistType").value,
            debut_date: byId("artistDebutDate").value || null,
            description: byId("artistDescription").value.trim() || null,
            is_featured: byId("artistFeatured").checked,
            profile_image: uploaded?.publicUrl ?? current?.profile_image ?? null,
            profile_image_path: uploaded?.path ?? current?.profile_image_path ?? null
        };

        if (!payload.name || !payload.slug || !payload.artist_type) {
            throw new Error("Name, slug, and artist type are required.");
        }

        const query = current
            ? supabase.from("artists").update(payload).eq("id", current.id)
            : supabase.from("artists").insert(payload);

        const { error } = await query;
        if (error) throw error;

        if (uploaded && current?.profile_image_path) {
            await removeImages([current.profile_image_path]);
        }

        resetArtistForm();
        byId("artistFormSection").hidden = true;
        await Promise.all([loadArtists(), loadMembers(), loadAlbums(), loadVideos()]);
    } catch (error) {
        if (uploaded?.path) await removeImages([uploaded.path]);
        showMessage(message, `Failed: ${error.message}`, "error");
    } finally {
        setButtonBusy(button, false);
    }
});

byId("artistList").addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-artist]");
    if (editButton) {
        const artist = state.artists.find((item) => String(item.id) === editButton.dataset.editArtist);
        if (artist) openArtistForm(artist);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-artist]");
    if (!deleteButton) return;

    const artistId = deleteButton.dataset.deleteArtist;
    const artist = state.artists.find((item) => String(item.id) === String(artistId));
    if (!artist || !window.confirm(`Delete ${artist.name} and all related members, albums, and videos?`)) return;

    setButtonBusy(deleteButton, true, "Deleting...");

    const relatedPaths = [artist.profile_image_path];
    const [membersResult, albumsResult, videosResult] = await Promise.all([
        supabase.from("members").select("profile_image_path").eq("artist_id", artistId),
        supabase.from("albums").select("cover_image_path").eq("artist_id", artistId),
        supabase.from("music_videos").select("thumbnail_image_path").eq("artist_id", artistId)
    ]);

    relatedPaths.push(...(membersResult.data || []).map((item) => item.profile_image_path));
    relatedPaths.push(...(albumsResult.data || []).map((item) => item.cover_image_path));
    relatedPaths.push(...(videosResult.data || []).map((item) => item.thumbnail_image_path));

    const relatedDeletes = await Promise.all([
        supabase.from("members").delete().eq("artist_id", artistId),
        supabase.from("albums").delete().eq("artist_id", artistId),
        supabase.from("music_videos").delete().eq("artist_id", artistId)
    ]);

    const relatedDeleteError = relatedDeletes.find((result) => result.error)?.error;
    if (relatedDeleteError) {
        alert(`Failed to delete related artist data: ${relatedDeleteError.message}`);
        setButtonBusy(deleteButton, false);
        return;
    }

    const { error } = await supabase.from("artists").delete().eq("id", artistId);
    if (error) {
        alert(`Failed to delete artist: ${error.message}`);
        setButtonBusy(deleteButton, false);
        return;
    }

    await removeImages(relatedPaths);
    await Promise.all([loadArtists(), loadMembers(), loadAlbums(), loadVideos()]);
});

async function loadMembers() {
    const loading = byId("memberLoading");
    const list = byId("memberList");
    loading.textContent = "Loading members...";

    const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

    if (error) {
        loading.textContent = `Failed to load members: ${error.message}`;
        return;
    }

    state.members = data || [];
    loading.textContent = "";

    if (!state.members.length) {
        list.innerHTML = '<p class="admin-empty">No members have been added yet.</p>';
        return;
    }

    list.innerHTML = state.members.map((member) => `
        <article class="admin-card compact-card">
            <img src="${escapeHtml(member.profile_image || fallbackImage())}"
                 alt="${escapeHtml(member.name)}"
                 onerror="this.src='${fallbackImage()}'">
            <div class="admin-card-body">
                <h3>${escapeHtml(member.name)}</h3>
                <p>${escapeHtml(member.position || "Member")}</p>
                <small>${escapeHtml(artistName(member.artist_id))}</small>
                <div class="admin-card-actions">
                    <button type="button" class="secondary-btn" data-edit-member="${member.id}">Edit</button>
                    <button type="button" class="danger-btn" data-delete-member="${member.id}">Delete</button>
                </div>
            </div>
        </article>
    `).join("");
}

function resetMemberForm() {
    byId("memberForm").reset();
    state.editing.member = null;
    byId("memberFormTitle").textContent = "Add New Member";
    byId("saveMemberBtn").textContent = "Save Member";
    delete byId("saveMemberBtn").dataset.defaultText;
    clearMessage(byId("memberFormMessage"));
}

function openMemberForm(member = null) {
    resetMemberForm();
    byId("memberArtistId").innerHTML = artistOptions(member?.artist_id);

    if (member) {
        state.editing.member = member;
        byId("memberArtistId").value = member.artist_id || "";
        byId("memberName").value = member.name || "";
        byId("memberPosition").value = member.position || "";
        byId("memberBirthDate").value = member.birth_date || "";
        byId("memberDescription").value = member.description || "";
        byId("memberDisplayOrder").value = member.display_order ?? 0;
        byId("memberFormTitle").textContent = `Edit ${member.name}`;
        byId("saveMemberBtn").textContent = "Update Member";
    }

    byId("memberFormSection").hidden = false;
    byId("memberFormSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

byId("addMemberBtn").addEventListener("click", () => openMemberForm());
byId("cancelMemberBtn").addEventListener("click", () => {
    resetMemberForm();
    byId("memberFormSection").hidden = true;
});

byId("memberForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = byId("memberFormMessage");
    const button = byId("saveMemberBtn");
    const current = state.editing.member;
    const file = byId("memberImageFile").files[0];
    let uploaded = null;

    setButtonBusy(button, true, current ? "Updating..." : "Saving...");
    showMessage(message, file ? "Uploading image..." : "Saving member...");

    try {
        if (file) uploaded = await uploadImage(file, "members");

        const payload = {
            artist_id: byId("memberArtistId").value,
            name: byId("memberName").value.trim(),
            position: byId("memberPosition").value.trim() || null,
            birth_date: byId("memberBirthDate").value || null,
            description: byId("memberDescription").value.trim() || null,
            display_order: Number(byId("memberDisplayOrder").value || 0),
            profile_image: uploaded?.publicUrl ?? current?.profile_image ?? null,
            profile_image_path: uploaded?.path ?? current?.profile_image_path ?? null
        };

        if (!payload.artist_id || !payload.name) throw new Error("Artist and member name are required.");

        const query = current
            ? supabase.from("members").update(payload).eq("id", current.id)
            : supabase.from("members").insert(payload);

        const { error } = await query;
        if (error) throw error;

        if (uploaded && current?.profile_image_path) await removeImages([current.profile_image_path]);

        resetMemberForm();
        byId("memberFormSection").hidden = true;
        await loadMembers();
    } catch (error) {
        if (uploaded?.path) await removeImages([uploaded.path]);
        showMessage(message, `Failed: ${error.message}`, "error");
    } finally {
        setButtonBusy(button, false);
    }
});

byId("memberList").addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-member]");
    if (editButton) {
        const member = state.members.find((item) => String(item.id) === editButton.dataset.editMember);
        if (member) openMemberForm(member);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-member]");
    if (!deleteButton) return;

    const member = state.members.find((item) => String(item.id) === deleteButton.dataset.deleteMember);
    if (!member || !window.confirm(`Delete ${member.name}?`)) return;

    setButtonBusy(deleteButton, true, "Deleting...");
    const { error } = await supabase.from("members").delete().eq("id", member.id);
    if (error) {
        alert(`Failed to delete member: ${error.message}`);
        setButtonBusy(deleteButton, false);
        return;
    }

    await removeImages([member.profile_image_path]);
    await loadMembers();
});

async function loadAlbums() {
    const loading = byId("albumLoading");
    const list = byId("albumListAdmin");
    loading.textContent = "Loading albums...";

    const { data, error } = await supabase
        .from("albums")
        .select("*")
        .order("release_date", { ascending: false });

    if (error) {
        loading.textContent = `Failed to load albums: ${error.message}`;
        return;
    }

    state.albums = data || [];
    loading.textContent = "";

    if (!state.albums.length) {
        list.innerHTML = '<p class="admin-empty">No albums have been added yet.</p>';
        return;
    }

    list.innerHTML = state.albums.map((album) => `
        <article class="admin-card compact-card">
            <img src="${escapeHtml(album.cover_image || fallbackImage())}"
                 alt="${escapeHtml(album.title)}"
                 onerror="this.src='${fallbackImage()}'">
            <div class="admin-card-body">
                <h3>${escapeHtml(album.title)}</h3>
                <p>${escapeHtml(album.album_type || "Release")}</p>
                <small>${escapeHtml(artistName(album.artist_id))} · ${escapeHtml(formatDate(album.release_date, "Coming soon"))}</small>
                <div class="admin-card-actions">
                    <button type="button" class="secondary-btn" data-edit-album="${album.id}">Edit</button>
                    <button type="button" class="danger-btn" data-delete-album="${album.id}">Delete</button>
                </div>
            </div>
        </article>
    `).join("");
}

function resetAlbumForm() {
    byId("albumForm").reset();
    state.editing.album = null;
    byId("albumFormTitle").textContent = "Add New Album";
    byId("saveAlbumBtn").textContent = "Save Album";
    delete byId("saveAlbumBtn").dataset.defaultText;
    clearMessage(byId("albumFormMessage"));
}

function openAlbumForm(album = null) {
    resetAlbumForm();
    byId("albumArtistId").innerHTML = artistOptions(album?.artist_id);

    if (album) {
        state.editing.album = album;
        byId("albumArtistId").value = album.artist_id || "";
        byId("albumTitle").value = album.title || "";
        byId("albumType").value = album.album_type || "";
        byId("albumReleaseDate").value = album.release_date || "";
        byId("albumSpotifyUrl").value = album.spotify_url || "";
        byId("albumFormTitle").textContent = `Edit ${album.title}`;
        byId("saveAlbumBtn").textContent = "Update Album";
    }

    byId("albumFormSection").hidden = false;
    byId("albumFormSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

byId("addAlbumBtn").addEventListener("click", () => openAlbumForm());
byId("cancelAlbumBtn").addEventListener("click", () => {
    resetAlbumForm();
    byId("albumFormSection").hidden = true;
});

byId("albumForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = byId("albumFormMessage");
    const button = byId("saveAlbumBtn");
    const current = state.editing.album;
    const file = byId("albumImageFile").files[0];
    let uploaded = null;

    setButtonBusy(button, true, current ? "Updating..." : "Saving...");
    showMessage(message, file ? "Uploading cover..." : "Saving album...");

    try {
        if (file) uploaded = await uploadImage(file, "albums");

        const payload = {
            artist_id: byId("albumArtistId").value,
            title: byId("albumTitle").value.trim(),
            album_type: byId("albumType").value.trim() || null,
            release_date: byId("albumReleaseDate").value || null,
            spotify_url: byId("albumSpotifyUrl").value.trim() || null,
            cover_image: uploaded?.publicUrl ?? current?.cover_image ?? null,
            cover_image_path: uploaded?.path ?? current?.cover_image_path ?? null
        };

        if (!payload.artist_id || !payload.title) throw new Error("Artist and album title are required.");

        const query = current
            ? supabase.from("albums").update(payload).eq("id", current.id)
            : supabase.from("albums").insert(payload);

        const { error } = await query;
        if (error) throw error;

        if (uploaded && current?.cover_image_path) await removeImages([current.cover_image_path]);

        resetAlbumForm();
        byId("albumFormSection").hidden = true;
        await loadAlbums();
    } catch (error) {
        if (uploaded?.path) await removeImages([uploaded.path]);
        showMessage(message, `Failed: ${error.message}`, "error");
    } finally {
        setButtonBusy(button, false);
    }
});

byId("albumListAdmin").addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-album]");
    if (editButton) {
        const album = state.albums.find((item) => String(item.id) === editButton.dataset.editAlbum);
        if (album) openAlbumForm(album);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-album]");
    if (!deleteButton) return;

    const album = state.albums.find((item) => String(item.id) === deleteButton.dataset.deleteAlbum);
    if (!album || !window.confirm(`Delete ${album.title}?`)) return;

    setButtonBusy(deleteButton, true, "Deleting...");
    const { error } = await supabase.from("albums").delete().eq("id", album.id);
    if (error) {
        alert(`Failed to delete album: ${error.message}`);
        setButtonBusy(deleteButton, false);
        return;
    }

    await removeImages([album.cover_image_path]);
    await loadAlbums();
});

async function loadVideos() {
    const loading = byId("videoLoading");
    const list = byId("videoListAdmin");
    loading.textContent = "Loading music videos...";

    const { data, error } = await supabase
        .from("music_videos")
        .select("*")
        .order("release_date", { ascending: false });

    if (error) {
        loading.textContent = `Failed to load videos: ${error.message}`;
        return;
    }

    state.videos = data || [];
    loading.textContent = "";

    if (!state.videos.length) {
        list.innerHTML = '<p class="admin-empty">No music videos have been added yet.</p>';
        return;
    }

    list.innerHTML = state.videos.map((video) => `
        <article class="admin-card compact-card">
            <img src="${escapeHtml(video.thumbnail_image || fallbackImage())}"
                 alt="${escapeHtml(video.title)}"
                 onerror="this.src='${fallbackImage()}'">
            <div class="admin-card-body">
                <h3>${escapeHtml(video.title)}</h3>
                <p>${escapeHtml(artistName(video.artist_id))}</p>
                <small>${escapeHtml(formatDate(video.release_date, "Coming soon"))}</small>
                <div class="admin-card-actions">
                    <button type="button" class="secondary-btn" data-edit-video="${video.id}">Edit</button>
                    <button type="button" class="danger-btn" data-delete-video="${video.id}">Delete</button>
                </div>
            </div>
        </article>
    `).join("");
}

function resetVideoForm() {
    byId("videoForm").reset();
    state.editing.video = null;
    byId("videoFormTitle").textContent = "Add New Music Video";
    byId("saveVideoBtn").textContent = "Save Video";
    delete byId("saveVideoBtn").dataset.defaultText;
    clearMessage(byId("videoFormMessage"));
}

function openVideoForm(video = null) {
    resetVideoForm();
    byId("videoArtistId").innerHTML = artistOptions(video?.artist_id);

    if (video) {
        state.editing.video = video;
        byId("videoArtistId").value = video.artist_id || "";
        byId("videoTitle").value = video.title || "";
        byId("videoReleaseDate").value = video.release_date || "";
        byId("videoYoutubeUrl").value = video.youtube_url || "";
        byId("videoFormTitle").textContent = `Edit ${video.title}`;
        byId("saveVideoBtn").textContent = "Update Video";
    }

    byId("videoFormSection").hidden = false;
    byId("videoFormSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

byId("addVideoBtn").addEventListener("click", () => openVideoForm());
byId("cancelVideoBtn").addEventListener("click", () => {
    resetVideoForm();
    byId("videoFormSection").hidden = true;
});

byId("videoForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = byId("videoFormMessage");
    const button = byId("saveVideoBtn");
    const current = state.editing.video;
    const file = byId("videoImageFile").files[0];
    let uploaded = null;

    setButtonBusy(button, true, current ? "Updating..." : "Saving...");
    showMessage(message, file ? "Uploading thumbnail..." : "Saving video...");

    try {
        if (file) uploaded = await uploadImage(file, "videos");

        const payload = {
            artist_id: byId("videoArtistId").value,
            title: byId("videoTitle").value.trim(),
            release_date: byId("videoReleaseDate").value || null,
            youtube_url: byId("videoYoutubeUrl").value.trim(),
            thumbnail_image: uploaded?.publicUrl ?? current?.thumbnail_image ?? null,
            thumbnail_image_path: uploaded?.path ?? current?.thumbnail_image_path ?? null
        };

        if (!payload.artist_id || !payload.title || !payload.youtube_url) {
            throw new Error("Artist, video title, and YouTube URL are required.");
        }

        const query = current
            ? supabase.from("music_videos").update(payload).eq("id", current.id)
            : supabase.from("music_videos").insert(payload);

        const { error } = await query;
        if (error) throw error;

        if (uploaded && current?.thumbnail_image_path) await removeImages([current.thumbnail_image_path]);

        resetVideoForm();
        byId("videoFormSection").hidden = true;
        await loadVideos();
    } catch (error) {
        if (uploaded?.path) await removeImages([uploaded.path]);
        showMessage(message, `Failed: ${error.message}`, "error");
    } finally {
        setButtonBusy(button, false);
    }
});

byId("videoListAdmin").addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-video]");
    if (editButton) {
        const video = state.videos.find((item) => String(item.id) === editButton.dataset.editVideo);
        if (video) openVideoForm(video);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-video]");
    if (!deleteButton) return;

    const video = state.videos.find((item) => String(item.id) === deleteButton.dataset.deleteVideo);
    if (!video || !window.confirm(`Delete ${video.title}?`)) return;

    setButtonBusy(deleteButton, true, "Deleting...");
    const { error } = await supabase.from("music_videos").delete().eq("id", video.id);
    if (error) {
        alert(`Failed to delete video: ${error.message}`);
        setButtonBusy(deleteButton, false);
        return;
    }

    await removeImages([video.thumbnail_image_path]);
    await loadVideos();
});

async function loadNews() {
    const loading = byId("newsLoading");
    const list = byId("newsListAdmin");
    loading.textContent = "Loading news...";

    const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("publish_date", { ascending: false });

    if (error) {
        loading.textContent = `Failed to load news: ${error.message}`;
        return;
    }

    state.news = data || [];
    loading.textContent = "";

    if (!state.news.length) {
        list.innerHTML = '<p class="admin-empty">No news has been added yet.</p>';
        return;
    }

    list.innerHTML = state.news.map((item) => `
        <article class="admin-card">
            <img src="${escapeHtml(item.cover_image || fallbackImage())}"
                 alt="${escapeHtml(item.title)}"
                 onerror="this.src='${fallbackImage()}'">
            <div class="admin-card-body">
                <div class="admin-card-heading">
                    <div>
                        <h3>${escapeHtml(item.title)}</h3>
                        <p>${escapeHtml(formatDate(item.publish_date, "No publish date"))}</p>
                    </div>
                    <span class="status-badge ${item.is_published ? "published" : "draft"}">${item.is_published ? "Published" : "Draft"}</span>
                </div>
                <div class="admin-card-actions">
                    <button type="button" class="secondary-btn" data-edit-news="${item.id}">Edit</button>
                    <button type="button" class="danger-btn" data-delete-news="${item.id}">Delete</button>
                </div>
            </div>
        </article>
    `).join("");
}

function resetNewsForm() {
    byId("newsForm").reset();
    state.editing.news = null;
    byId("newsFormTitle").textContent = "Add News";
    byId("saveNewsBtn").textContent = "Save News";
    delete byId("saveNewsBtn").dataset.defaultText;
    byId("newsPublishDate").value = new Date().toISOString().slice(0, 10);
    clearMessage(byId("newsFormMessage"));
    delete byId("newsSlug").dataset.touched;
}

function openNewsForm(item = null) {
    resetNewsForm();

    if (item) {
        state.editing.news = item;
        byId("newsTitle").value = item.title || "";
        byId("newsSlug").value = item.slug || "";
        byId("newsSummary").value = item.summary || "";
        byId("newsContent").value = item.content || "";
        byId("newsPublishDate").value = item.publish_date || "";
        byId("newsPublished").checked = Boolean(item.is_published);
        byId("newsFormTitle").textContent = `Edit ${item.title}`;
        byId("saveNewsBtn").textContent = "Update News";
    }

    byId("newsFormSection").hidden = false;
    byId("newsFormSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

byId("newsTitle").addEventListener("input", () => {
    if (!state.editing.news && !byId("newsSlug").dataset.touched) {
        byId("newsSlug").value = slugify(byId("newsTitle").value);
    }
});
byId("newsSlug").addEventListener("input", () => {
    byId("newsSlug").dataset.touched = "true";
});

byId("addNewsBtn").addEventListener("click", () => openNewsForm());
byId("cancelNewsBtn").addEventListener("click", () => {
    resetNewsForm();
    byId("newsFormSection").hidden = true;
});

byId("newsForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = byId("newsFormMessage");
    const button = byId("saveNewsBtn");
    const current = state.editing.news;
    const file = byId("newsImageFile").files[0];
    let uploaded = null;

    setButtonBusy(button, true, current ? "Updating..." : "Saving...");
    showMessage(message, file ? "Uploading cover..." : "Saving news...");

    try {
        if (file) uploaded = await uploadImage(file, "news");

        const payload = {
            title: byId("newsTitle").value.trim(),
            slug: slugify(byId("newsSlug").value),
            summary: byId("newsSummary").value.trim() || null,
            content: byId("newsContent").value.trim(),
            publish_date: byId("newsPublishDate").value || null,
            is_published: byId("newsPublished").checked,
            cover_image: uploaded?.publicUrl ?? current?.cover_image ?? null,
            cover_image_path: uploaded?.path ?? current?.cover_image_path ?? null
        };

        if (!payload.title || !payload.slug || !payload.content) {
            throw new Error("Title, slug, and content are required.");
        }

        const query = current
            ? supabase.from("news").update(payload).eq("id", current.id)
            : supabase.from("news").insert(payload);

        const { error } = await query;
        if (error) throw error;

        if (uploaded && current?.cover_image_path) await removeImages([current.cover_image_path]);

        resetNewsForm();
        byId("newsFormSection").hidden = true;
        await loadNews();
    } catch (error) {
        if (uploaded?.path) await removeImages([uploaded.path]);
        showMessage(message, `Failed: ${error.message}`, "error");
    } finally {
        setButtonBusy(button, false);
    }
});

byId("newsListAdmin").addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-news]");
    if (editButton) {
        const item = state.news.find((news) => String(news.id) === editButton.dataset.editNews);
        if (item) openNewsForm(item);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-news]");
    if (!deleteButton) return;

    const item = state.news.find((news) => String(news.id) === deleteButton.dataset.deleteNews);
    if (!item || !window.confirm(`Delete “${item.title}”?`)) return;

    setButtonBusy(deleteButton, true, "Deleting...");
    const { error } = await supabase.from("news").delete().eq("id", item.id);
    if (error) {
        alert(`Failed to delete news: ${error.message}`);
        setButtonBusy(deleteButton, false);
        return;
    }

    await removeImages([item.cover_image_path]);
    await loadNews();
});

byId("logoutBtn").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
        alert(error.message);
        return;
    }
    window.location.replace("admin-login.html");
});

const authorized = await protectDashboard();
if (authorized) {
    activatePanel("artists");
    resetNewsForm();
    await loadArtists();
    await Promise.all([loadMembers(), loadAlbums(), loadVideos(), loadNews()]);
}
