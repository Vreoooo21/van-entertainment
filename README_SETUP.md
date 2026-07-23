# VAN ENTERTAINMENT — Setup Sekali Saja

Versi ini sudah berisi CMS lengkap untuk:

- tambah, edit, hapus artis;
- tambah, edit, hapus member;
- tambah album dan cover;
- tambah Music Video dan link YouTube;
- tambah berita, draft, dan publish;
- Featured Artists otomatis di homepage;
- profil artis dinamis berdasarkan `artist.html?slug=...`;
- member, album, dan video otomatis muncul di profil;
- halaman berita dan detail berita dinamis;
- upload/ganti/hapus gambar melalui Supabase Storage;
- proteksi dashboard menggunakan login dan RLS.

## 1. Isi koneksi Supabase

Buka `js/supabase.js`, lalu isi:

```js
const SUPABASE_URL = "https://PROJECT-ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_OR_ANON_KEY";
```

Jangan gunakan `service_role` atau secret key di website.

## 2. Jalankan SQL lengkap

Buka `supabase-setup.sql`.

Di bagian paling bawah, hilangkan tanda `--` pada perintah INSERT owner dan ganti `YOUR_OWNER_USER_UUID` dengan UUID akun owner dari:

`Supabase → Authentication → Users`

Setelah itu jalankan seluruh isi file di:

`Supabase → SQL Editor`

Script ini mempertahankan tabel `artists` yang sudah ada dan menambahkan tabel/kolom yang diperlukan.

## 3. Jalankan website

- Login owner: `admin-login.html`
- Dashboard: `dashboard.html`
- Website utama: `index.html`

Untuk update Vercel:

```bash
git add .
git commit -m "Complete VAN Entertainment CMS"
git push
```

## Catatan

- Bucket yang digunakan bernama `artist-images`.
- Gambar maksimal 5 MB dan harus JPG, PNG, atau WebP.
- `valkyrie.html` dan `avalune.html` sekarang otomatis mengarah ke halaman profil dinamis.
- File lama `js/artists.js` tidak lagi dipakai; dashboard menggunakan `js/admin.js`.
