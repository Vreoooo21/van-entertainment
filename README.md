# VAN CMS — Notifications + Survival Detail + Member Birthday

## Perubahan

- Menu Notifications dan panelnya benar-benar ditambahkan ke dashboard.
- Service worker cache dinaikkan agar dashboard lama tidak terus muncul.
- Firebase web client memakai registration token melalui `getToken()`.
- Edge Function mengirim ke `message.token`.
- Semua survival otomatis memiliki halaman detail melalui `survival-detail.html?slug=...`.
- `Detail URL` di CMS menjadi opsional untuk project yang memiliki halaman khusus.
- Tanggal lahir member tampil di kartu member pada halaman artist.

## Pemasangan

Salin semua file patch dan pilih Replace. Jangan menimpa `js/supabase.js`.

Untuk fitur push background, jalankan `pwa-push-migration.sql` jika tabel `admin_push_devices` belum pernah dibuat, lalu lanjutkan konfigurasi Firebase sesuai `README_PWA_PUSH.md`.

Setelah upload ke hosting:

1. Tutup aplikasi VAN CMS jika sedang terpasang.
2. Buka situs lewat Chrome.
3. Hapus cache situs atau tekan Ctrl+Shift+R di desktop.
4. Buka dashboard lagi.
5. Menu Notifications akan muncul di antara Applications dan VAN Voice.
