# Loading, navigation and location filters

The initial CSS motion described here has been upgraded to GSAP-driven scroll reveals, staggered cards, hover/focus lift, image zoom and control feedback. See [MOTION.md](MOTION.md) for the current animation system and component reuse instructions.

The public interface uses shared skeletons for listing, article, account, calendar, gallery, weather and editor routes. Heavy editor, calendar, gallery and chart modules have dynamic loading fallbacks. Optional article comments mount near the viewport, then show a skeleton while their request completes. Public images retain their dimensions, load lazily except the lead story, and use placeholders and an image-error fallback. Primary branding stays eager. Header weather and trending have independent Suspense boundaries.

Motion uses a shared short duration and easing: card/panel entrances, button press feedback, focus/hover transitions, image fades and an opaque menu entrance. Reduced-motion preferences disable animation, shimmer, transitions and image zoom. Existing ad lazy loading and video click-to-load behavior are retained.

The icon-only hamburger stays at the start of the scrolling category bar. Its dialog includes all main categories and utility sections, fits the viewport, locks background scrolling, handles Tab/Shift+Tab, closes on Escape/backdrop/link selection, and restores focus to its opener.

## Location coverage and operation

- The home page has expandable “News near you” controls leading to `/news`. News, categories, videos, search, events, basadis, notices and opportunities support state → district → city/town selection.
- Changing a state clears district and city; changing a district clears city. Children are disabled until their parent is selected. Filters are stored in the URL, combine with other search criteria and persist through pagination. Applying or clearing location filters resets the page number.
- News SQL filters locations before counting and pagination. Explicit `place_id` is authoritative; unlinked legacy content can match an exact saved place name. Unknown or conflicting filters produce no results rather than showing unrelated stories.
- The current sample catalog contains Karnataka's existing 31 district records and nine city/town records, including the four previously supplied Jain centres. It is not an exhaustive all-India city database. Other states, districts and cities appear automatically when added to Places. The catalog query now reads all pages instead of stopping at 500 places.
- In `/admin/places`, enter a consistent State and District for each record. Check **District** only for district records; leave it unchecked for a city/town. Give each place a unique slug. In the post editor, select the actual reporting place so identical city names remain unambiguous. Community records also use their place reference; legacy event records use exact place names.

## Database setup

Apply `supabase/migrations/20260916003600_location_filters.sql` after migration 35 on an initialized project. This adds the state field and index and updates the public listing RPC while retaining publication and RLS constraints. Existing places default to Karnataka, matching the existing catalog. For a new project, the regenerated release bundle contains all 36 migrations; do not apply both initialization methods. Additional demo city records are in `seed-v4.sql`, for development only.

The local preview remains in demo mode. No live Supabase migration or external delivery was performed during these UI changes.

Implementation follows Next.js [lazy loading](https://nextjs.org/docs/app/guides/lazy-loading) and [Form navigation](https://nextjs.org/docs/app/api-reference/components/form) documentation. Tests are in `tests/unit/geography.test.ts`, `tests/e2e/responsive-filters.spec.ts`, and the location assertions in `scripts/check-database.mjs`.
