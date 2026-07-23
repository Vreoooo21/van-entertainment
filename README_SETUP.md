# VAN ENTERTAINMENT — CMS Extended Setup

Versi ini sudah mencakup:

- CMS artis, member, album, music video, dan berita;
- editor teks seluruh bagian utama website;
- Theme Manager dan maintenance banner;
- Navigation Manager;
- custom page builder melalui `page.html?slug=...`;
- role Founder, Co-Founder, CEO 1, CEO 2, Co-CEO 1, Co-CEO 2, serta role staf;
- profil petinggi di `leadership.html`;
- Survival Project Manager;
- batch dan formulir audisi;
- nomor WhatsApp dengan pilihan kode negara global, bendera, dan pencarian negara;
- inbox pendaftar, status seleksi, catatan admin, chat WhatsApp, dan ekspor CSV;
- VAN Voice untuk saran, keluhan, laporan, apresiasi, posting publik/privat/anonim, tiket, PIN, tracking, dan moderasi;
- notifikasi pendaftar audisi melalui WhatsApp Cloud API.

## 1. Isi koneksi Supabase

Buka `js/supabase.js`, lalu isi URL proyek dan anon/publishable key:

```js
const SUPABASE_URL = "https://PROJECT-ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_OR_ANON_KEY";
```

Jangan menaruh `service_role`, token WhatsApp, atau secret key apa pun di folder website.

## 2. Jalankan SQL lengkap

Buka `supabase-setup.sql`, lalu jalankan seluruh isinya di:

`Supabase → SQL Editor`

File SQL aman dijalankan ulang dan mempertahankan tabel CMS lama. UUID Founder yang sudah ada tetap digunakan:

`c28ba16b-2b95-41a4-92e2-bccfd5f3bfeb`

Pastikan UUID tersebut memang akun Founder di `Authentication → Users`. Jika berbeda, ubah UUID pada dua bagian owner/founder di SQL sebelum menjalankannya.

## 3. Login dan dashboard

- Login: `admin-login.html`
- Dashboard: `dashboard.html`
- Website: `index.html`

Untuk menambah admin:

1. buat akun di `Supabase → Authentication → Users`;
2. salin User UUID;
3. login sebagai role eksekutif;
4. buka `Admin Roles` di dashboard;
5. masukkan UUID dan pilih role.

## 4. Aktifkan notifikasi WhatsApp

Install Supabase CLI dan login, lalu dari root proyek jalankan:

```bash
supabase functions deploy notify-audition
```

Set secrets server:

```bash
supabase secrets set \
  META_WA_ACCESS_TOKEN="TOKEN_META" \
  META_WA_PHONE_NUMBER_ID="PHONE_NUMBER_ID" \
  VAN_ADMIN_WHATSAPP="6281234567890" \
  META_GRAPH_VERSION="v25.0"
```

Untuk notifikasi produksi, buat template WhatsApp yang disetujui lalu tambahkan:

```bash
supabase secrets set \
  META_WA_TEMPLATE_NAME="van_audition_notification" \
  META_WA_TEMPLATE_LANGUAGE="id"
```

Urutan variabel template:

1. kode pendaftaran;
2. nama calon trainee;
3. kategori audisi;
4. nomor WhatsApp calon trainee.

Tanpa secret WhatsApp, form audisi tetap berhasil menyimpan data. Hanya notifikasi WhatsApp yang dilewati.

## 5. Urutan penggunaan awal

1. Jalankan SQL.
2. Login ke dashboard.
3. Buat minimal satu `Audition Program`.
4. Atur status menjadi `Open` dan centang `Publish program`.
5. Isi profil petinggi di menu `Leadership`.
6. Edit teks, tema, menu, dan halaman lain sesuai kebutuhan.
7. Uji form `audition.html` dan `voice.html`.

## 6. Deploy ke Vercel/GitHub

Folder `.git` tidak perlu dimasukkan ke ZIP. Untuk update repository:

```bash
git add .
git commit -m "Add VAN CMS extended modules"
git push
```

## Catatan keamanan

- Bucket media tetap bernama `artist-images`.
- Gambar maksimal 5 MB dan harus JPG, PNG, atau WebP.
- Pendaftar audisi tidak dapat membaca data pendaftar lain.
- VAN Voice anonim tidak menampilkan identitas pengirim di view publik.
- Role non-eksekutif tidak dapat membuka pengelolaan Admin Roles.
- Penghapusan data sensitif dibatasi lagi oleh RLS Supabase.

## Responsive update

This build includes a dedicated mobile layout for the public website and VAN CMS dashboard.

- Dashboard sidebar becomes an off-canvas hamburger menu at 820 px and below.
- Dashboard forms switch to one full-width column on tablets and phones.
- Cards, action buttons, filters, file inputs, and content lists adapt to narrow screens.
- Public hero and page headings resize without cropping or splitting words incorrectly.
- About imagery and mobile section spacing are reduced for small screens.
- Layout checks were performed at 320 px, 360 px, 390 px, 768 px, and desktop width.

No Supabase SQL migration is required for this responsive-only update.
