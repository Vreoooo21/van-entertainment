# VAN CMS — Aplikasi PWA + Push Notification Gratis

Versi ini membuat dashboard bisa diinstal sebagai aplikasi di HP dan menerima notifikasi pendaftar audisi baru melalui Firebase Cloud Messaging (FCM).

## A. Yang langsung berfungsi setelah file di-upload

- Dashboard dapat diinstal sebagai PWA.
- Ikon VAN CMS muncul di layar utama.
- Menu aplikasi membuka dashboard langsung.
- Badge jumlah pendaftar berstatus `New` tampil pada menu Applications.
- Saat dashboard sedang terbuka, pendaftar baru dapat muncul sebagai toast/realtime alert.
- Tombol tes notifikasi lokal tersedia.

## B. Jalankan SQL

Jalankan `pwa-push-migration.sql` di Supabase SQL Editor.

## C. Buat Firebase gratis

1. Buka Firebase Console dan buat project `VAN CMS`.
2. Tambahkan aplikasi Web (`</>`).
3. Salin konfigurasi Firebase ke `js/firebase-config.js`.
4. Buka Pengaturan project → Cloud Messaging.
5. Di bagian sertifikat Web Push, buat pasangan kunci dan salin kunci publik VAPID ke `VAN_FIREBASE_VAPID_KEY`.
6. Pastikan Firebase Cloud Messaging API (HTTP v1) aktif.

Konfigurasi web Firebase bukan secret. Jangan pernah memasukkan file akun layanan Firebase ke folder website/GitHub.

## D. Deploy Edge Function

Dari terminal folder project:

```bash
supabase login
supabase link --project-ref PROJECT_REF_SUPABASE
supabase functions deploy notify-audition-push
```

## E. Masukkan secrets server

Unduh akun layanan melalui Firebase Console → Pengaturan project → Akun layanan → Buat kunci pribadi baru.

Cara aman melalui terminal:

```bash
supabase secrets set VAN_PUSH_WEBHOOK_SECRET="BUAT_KODE_ACAK_PANJANG"
supabase secrets set VAN_CMS_URL="https://alamat-website-kamu.vercel.app"
supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON="$(cat lokasi/service-account.json)"
```

`FIREBASE_SERVICE_ACCOUNT_JSON` dan secret webhook tidak boleh dimasukkan ke GitHub.

## F. Buat Database Webhook

Supabase → Database → Webhooks → Create Webhook:

- Name: `notify-new-audition-push`
- Table: `audition_applications`
- Event: `INSERT`
- Method: `POST`
- URL: `https://PROJECT_REF.supabase.co/functions/v1/notify-audition-push`
- Header: `x-van-push-secret` = nilai yang sama dengan `VAN_PUSH_WEBHOOK_SECRET`

## G. Aktifkan di HP admin

1. Buka dashboard dari Chrome melalui HTTPS.
2. Login.
3. Buka menu `Notifications`.
4. Tekan `Aktifkan notifikasi` dan izinkan.
5. Tekan `Instal aplikasi` atau pilih menu browser → Instal aplikasi/Tambahkan ke layar utama.
6. Kirim formulir audition baru untuk menguji push background.

## Catatan

- Android/Chrome dapat menerima push setelah izin diberikan.
- Di iPhone/iPad, web push memerlukan PWA ditambahkan ke layar utama dan sistem yang mendukung web push.
- Jika hanya ingin aplikasi tanpa Firebase, PWA tetap bisa dipasang; push background saja yang belum aktif.
