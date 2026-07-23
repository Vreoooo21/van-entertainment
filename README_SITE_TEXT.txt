VAN WEBSITE CONTENT / SITE TEXT PATCH

1. Run website-content-migration.sql in Supabase SQL Editor.
2. Copy dashboard.html, css/admin.css, js/admin-extended.js, and all included public HTML files into the website folder.
3. Do not replace js/supabase.js. This patch does not include it.
4. Upload to GitHub/Vercel and hard refresh with Ctrl+Shift+R.
5. Open Dashboard > Site Text. Search for “Old but Gold” or select a page, edit, and press Save All Changes.

Navigation labels are managed in Navigation Manager. Artist/member data, Leadership profiles, Survival projects, Audition programs, News, and VAN Voice records stay in their respective dashboard menus.

Existing site_content edits are preserved because the migration only updates metadata/defaults, not your current content_value.
