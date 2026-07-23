# Artist Debut Date Sorting

The Artists page, featured artists on the homepage, and the Artists list in the dashboard are now ordered automatically by full debut date, from oldest to newest.

- Artists with the same debut date are ordered alphabetically.
- Artists without a debut date are placed at the bottom as pre-debut/unannounced.
- No Supabase SQL migration is required because the existing `debut_date` column is used.

After uploading the updated files, hard-refresh the browser. If VAN CMS is installed as a PWA, close and reopen it so service-worker cache version `v5` is activated.
