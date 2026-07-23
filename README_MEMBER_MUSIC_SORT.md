# Member and Discography Sorting

This update applies automatic chronological sorting:

- Members: oldest birth date first. Missing birth dates appear last.
- Albums: oldest release date first. Missing release dates appear last.
- Music videos / songs: oldest release date first. Missing release dates appear last.
- Equal dates are sorted alphabetically by name/title.
- The same ordering is used on public artist profiles and in the CMS lists.

No Supabase SQL migration is required because the existing `birth_date` and `release_date` columns are used.
