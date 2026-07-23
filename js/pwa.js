let deferredInstallPrompt = null;

async function registerVanServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register("./firebase-messaging-sw.js", {
      scope: "./",
      updateViaCache: "none"
    });
    await registration.update().catch(() => {});
    return registration;
  } catch (error) {
    console.error("Service worker VAN CMS gagal didaftarkan:", error);
    return null;
  }
}

function setupInstallButton() {
  const button = document.getElementById("installPwaBtn");
  if (!button) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    button.hidden = false;
  });

  button.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      alert("Buka menu browser lalu pilih ‘Instal aplikasi’ atau ‘Tambahkan ke layar utama’.");
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    button.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    button.hidden = true;
    deferredInstallPrompt = null;
  });
}

registerVanServiceWorker();
setupInstallButton();
