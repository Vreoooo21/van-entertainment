import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging.js";
import { supabase } from "./supabase.js";

const $ = (id) => document.getElementById(id);
const TOKEN_STORAGE_KEY = "vanCmsFcmToken";
let messaging = null;
let currentUser = null;
let realtimeChannel = null;

function configured() {
  const cfg = window.VAN_FIREBASE_CONFIG || {};
  const vapid = window.VAN_FIREBASE_VAPID_KEY || "";
  return Boolean(
    cfg.apiKey && !String(cfg.apiKey).startsWith("PASTE_") &&
    cfg.projectId && !String(cfg.projectId).startsWith("PASTE_") &&
    cfg.messagingSenderId && !String(cfg.messagingSenderId).startsWith("PASTE_") &&
    cfg.appId && !String(cfg.appId).startsWith("PASTE_") &&
    vapid && !String(vapid).startsWith("PASTE_")
  );
}

function setStatus(text, type = "info") {
  const el = $("pushStatus");
  if (!el) return;
  el.textContent = text;
  el.dataset.type = type;
}

function deviceName() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "Perangkat";
  const mobile = navigator.userAgentData?.mobile ? "HP" : "Browser";
  return `${mobile} ${platform}`.trim();
}

async function serviceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Browser ini tidak mendukung aplikasi PWA.");
  }
  const registration = await navigator.serviceWorker.register("./firebase-messaging-sw.js", {
    scope: "./",
    updateViaCache: "none"
  });
  await registration.update().catch(() => {});
  return registration;
}

async function saveToken(token) {
  const previousToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (previousToken && previousToken !== token) {
    await supabase
      .from("admin_push_devices")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("firebase_fid", previousToken)
      .eq("user_id", currentUser.id);
  }

  const payload = {
    user_id: currentUser.id,
    firebase_fid: token,
    device_name: deviceName(),
    user_agent: navigator.userAgent,
    enabled: true,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("admin_push_devices")
    .upsert(payload, { onConflict: "firebase_fid" });
  if (error) throw error;

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  await loadDevices();
}

async function removeStoredToken(token) {
  if (!token || !currentUser) return;
  await supabase
    .from("admin_push_devices")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("firebase_fid", token)
    .eq("user_id", currentUser.id);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  await loadDevices();
}

async function initMessaging() {
  if (!configured()) {
    throw new Error("Konfigurasi Firebase belum diisi di js/firebase-config.js.");
  }
  if (!(await isSupported())) {
    throw new Error("Push notification tidak didukung browser ini.");
  }

  const app = getApps().length ? getApps()[0] : initializeApp(window.VAN_FIREBASE_CONFIG);
  messaging = getMessaging(app);
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "Pendaftar audisi baru";
    const body = payload.notification?.body || payload.data?.body || "Ada pendaftaran baru di VAN CMS.";
    showToast(title, body);
    refreshNewCount();
  });
}

async function enablePush() {
  const button = $("enablePushBtn");
  if (!button) return;
  button.disabled = true;
  try {
    setStatus("Meminta izin notifikasi...");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Izin notifikasi belum diberikan.");
    }

    if (!messaging) await initMessaging();
    const registration = await serviceWorkerRegistration();
    const token = await getToken(messaging, {
      vapidKey: window.VAN_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    if (!token) throw new Error("Token notifikasi belum berhasil dibuat.");

    await saveToken(token);
    setStatus("Notifikasi aktif di perangkat ini.", "success");
  } catch (error) {
    setStatus(error.message || String(error), "error");
  } finally {
    button.disabled = false;
  }
}

async function disablePush() {
  const button = $("disablePushBtn");
  if (!button) return;
  button.disabled = true;
  try {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (configured()) {
      if (!messaging) await initMessaging();
      await deleteToken(messaging).catch(() => false);
    }
    await removeStoredToken(storedToken);
    setStatus("Notifikasi dinonaktifkan di perangkat ini.", "success");
  } catch (error) {
    setStatus(error.message || String(error), "error");
  } finally {
    button.disabled = false;
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
  })[char]);
}

function showToast(title, body) {
  let toast = $("pushToast");
  if (!toast) {
    toast = document.createElement("button");
    toast.type = "button";
    toast.id = "pushToast";
    toast.className = "push-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;
  toast.hidden = false;
  toast.onclick = () => {
    location.hash = "applications";
    toast.hidden = true;
  };
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 8000);
}

async function loadDevices() {
  const list = $("pushDeviceList");
  if (!list || !currentUser) return;
  const { data, error } = await supabase
    .from("admin_push_devices")
    .select("id,firebase_fid,device_name,enabled,last_seen_at,created_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p class="error-state">${escapeHtml(error.message)}</p>`;
    return;
  }

  const active = (data || []).filter((item) => item.enabled);
  list.innerHTML = active.length ? active.map((item) => `
    <article class="admin-list-row">
      <div class="admin-list-main">
        <h3>${escapeHtml(item.device_name || "Perangkat admin")}</h3>
        <p>Aktif · terakhir diperbarui ${new Date(item.last_seen_at || item.created_at).toLocaleString("id-ID")}</p>
      </div>
      <span class="status-badge published">Push aktif</span>
    </article>`).join("") : '<p class="admin-empty">Belum ada perangkat yang mengaktifkan push notification.</p>';
}

async function refreshNewCount() {
  const badge = $("applicationsBadge");
  if (!badge) return;
  const { count, error } = await supabase
    .from("audition_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "New");
  if (error) return;

  const total = count || 0;
  badge.textContent = total > 99 ? "99+" : String(total);
  badge.hidden = total === 0;
  document.title = total ? `(${total}) VAN CMS` : "VAN CMS | Owner Dashboard";
}

function subscribeApplications() {
  realtimeChannel = supabase
    .channel("van-cms-new-applications")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "audition_applications"
    }, (payload) => {
      const application = payload.new || {};
      showToast(
        "Pendaftar audisi baru",
        `${application.full_name || "Seseorang"} mendaftar kategori ${application.category || "Audition"}.`
      );
      refreshNewCount();
    })
    .subscribe();
}

function localTest() {
  if (!("Notification" in window)) {
    setStatus("Browser ini tidak mendukung notifikasi.", "error");
    return;
  }
  if (Notification.permission !== "granted") {
    setStatus("Aktifkan izin notifikasi terlebih dahulu.", "error");
    return;
  }
  navigator.serviceWorker.ready.then((registration) => registration.showNotification("Tes VAN CMS", {
    body: "Notifikasi di HP ini sudah bisa ditampilkan.",
    icon: "./images/app-icons/icon-192.png",
    badge: "./images/app-icons/badge-96.png",
    tag: "van-cms-local-test",
    data: { url: "./dashboard.html#applications" }
  }));
}

async function boot() {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user;
  if (!currentUser) return;

  $("enablePushBtn")?.addEventListener("click", enablePush);
  $("disablePushBtn")?.addEventListener("click", disablePush);
  $("testPushBtn")?.addEventListener("click", localTest);
  $("refreshPushDevicesBtn")?.addEventListener("click", loadDevices);

  if (!("Notification" in window)) {
    setStatus("Browser ini tidak mendukung notifikasi.", "error");
  } else if (!configured()) {
    setStatus("Aplikasi sudah siap, tetapi Firebase belum dikonfigurasi. Isi js/firebase-config.js untuk push saat aplikasi ditutup.");
  } else if (Notification.permission === "granted") {
    try {
      await initMessaging();
      const registration = await serviceWorkerRegistration();
      const token = await getToken(messaging, {
        vapidKey: window.VAN_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      if (token) await saveToken(token);
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  } else if (Notification.permission === "denied") {
    setStatus("Notifikasi diblokir browser. Aktifkan kembali dari Setelan situs.", "error");
  }

  await Promise.allSettled([loadDevices(), refreshNewCount()]);
  subscribeApplications();
  setInterval(refreshNewCount, 30000);
}

window.addEventListener("beforeunload", () => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
});

boot();
