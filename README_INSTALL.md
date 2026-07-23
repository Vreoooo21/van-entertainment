# VAN Member, Album, and Song Sorting Patch

Replace these files in the current VAN project:

- `js/utils.js`
- `js/artist-profile.js`
- `js/admin.js`
- `firebase-messaging-sw.js`

No SQL migration is required.

Sorting rules:

- Members: oldest birth date first; missing birthdays last.
- Albums: oldest release date first; missing release dates last.
- Music videos / songs: oldest release date first; missing release dates last.
- Equal dates: alphabetical by member name or release title.

After deployment, hard-refresh the browser. If VAN CMS is installed as a PWA, close and reopen it so service worker cache v6 replaces the older files.
