# notify-audition

Supabase Edge Function untuk mengirim notifikasi WhatsApp kepada admin setelah pendaftaran audisi tersimpan.

Secrets yang diperlukan:

- `META_WA_ACCESS_TOKEN`
- `META_WA_PHONE_NUMBER_ID`
- `VAN_ADMIN_WHATSAPP` — format internasional tanpa tanda `+`, contoh `6281234567890`
- `META_GRAPH_VERSION` — contoh `v25.0`
- `META_WA_TEMPLATE_NAME` — opsional, tetapi disarankan untuk notifikasi produksi
- `META_WA_TEMPLATE_LANGUAGE` — default `id`

Jika menggunakan template, urutan parameter body adalah:

1. kode pendaftaran;
2. nama calon trainee;
3. kategori;
4. nomor WhatsApp calon trainee.
