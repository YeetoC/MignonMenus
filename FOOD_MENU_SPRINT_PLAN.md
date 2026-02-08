# Food Menu Manager (Supabase + Shadcn) — Sprint Plan

## 0. Product summary

You are building a **single-page (SPA-feel) Food Menu manager** for an event company out of the Bookmark Manager Template.

- **Menus** are the core entity (replaces bookmarks).
- **Locations** replace bookmark collections.
- **Tags** remain as they are (but become real DB entities, not mock data).
- **Backend**: Supabase (Postgres database, Storage, optional Edge Functions).
- **Auth**: Supabase Auth with **email + password** (internal tool; signups disabled).
- **UX goal**: Selecting a new location / tags / view mode must feel **instant**.
  - We will use **SPA Option A**: fetch **all menus** once, then filter locally.

## 1. Requirements (locked)

### 1.1 Menus
- **Fields**
  - `title` (required)
  - `description` (optional)
  - `menuContent` (required, plain text)
  - `pricePerPersonCents` (optional; stored as integer cents; input/edit shown as EUR)
  - `image` (optional; stored in Supabase Storage; grid view shows it, row view does not)
  - `locationIds` (0..n, multiple locations possible)
  - `tagIds` (0..n)
  - `status`: `"active" | "archived"`
  - `isFavorite` boolean (derived per-user; not stored on the shared menu document)
  - `deletedAt` (nullable timestamp) for trash
  - timestamps `createdAt`, `updatedAt`
  - **State rules**
    - `deletedAt` means the menu is in Trash and hidden from Active/Archive/Favorites views.
    - `status` only applies to non-trashed menus (`active` vs `archived`).
    - Trashed items are kept for **30 days**, then permanently deleted.

### 1.2 Filters / search
- Location selection (single “current location” filter)
  - The “current location” means: show menus where `locationIds` includes the selected location.
  - Provide an “All locations” state that shows every menu (including those with no locations).
  - Provide an “Unassigned” state to show menus with `locationIds.length === 0`.
- Tag multi-filter (toggle chips)
- Search: **title + description only**
- Sorting can stay (date + alpha)
  - Use `updatedAt` (desc) as the primary sort, then `title` (A-Z) as a tiebreaker.

### 1.3 UI behavior
- **Grid view**
  - Shows menu image (optional) in place of favicon slot
  - Shows description
  - Top-right actions:
    - Copy button **left of** heart
    - Heart (favorite)
  - Bottom-right shows `€X / person` when price exists
- **Row view**
  - No image
  - Description hidden
  - Copy button present
  - Price displayed (where URL used to be)
- Clicking a menu opens a **shadcn dialog** using the **sticky footer** pattern.
  - Dialog footer includes a **Copy** button (copies `menuContent` only) and Close.

### 1.4 Add Menu
- Replace “Add Bookmark” with **Add Menu**.
- Opens a shadcn dialog/popup.
- Form is inspired by `ecommerce-add-product` but simplified:
  - Remove SKU, barcode, variants, charge tax, discounted price, in stock, draft.
  - Status: only **Active** or **Archived**.
  - Keep media upload (optional).
  - Keep description; add **Menu Content** textarea below description.
  - Tags section:
    - Use **shadcn combobox** (searchable) + “add new” via plus.
    - Combobox UI should not include an extra icon button before the dropdown chevron.
    - Allow multiple tags by adding additional combobox rows via plus button.
    - “Add new” creates immediately and selects the new tag (no extra confirmation step).
  - Locations section:
    - Same behavior as tags (combobox + plus + add new).
    - “Add new” creates immediately and selects the new location (no extra confirmation step).

## 2. Non-goals (for initial release)
- Rich-text menu editing or formatting
- (We can expand menu content formatting later if needed.)
- Full-text search inside `menuContent`
- Complex permissions / org management (unless required later)
- SSR requirement (we’ll keep it client-centric to preserve instant interactions)

## 3. Architecture & technical approach

### 3.1 Client state model (SPA feel)
- Use **Zustand** for UI state only:
  - selected location
  - selected tags
  - view mode (grid/list)
  - sort mode
  - filter type (all/favorites/with-tags/without-tags)
  - search query
  - currently opened menu dialog id
  - “add menu” dialog open state
- Fetch data from Supabase once on app boot via a single **bootstrap read model** endpoint:
  - `GET /api/bootstrap` returns `menus`, `tags`, `locations`, and (when logged in) the current user’s favorites.
  - This keeps the “fetch once, filter locally” UX while allowing us to evolve DB relations (join tables) without rewriting UI.
- Compute filtered menus **locally** using memoized selectors (`useMemo` or store selector) to keep clicks instant.
  - Filtering logic should live in a single shared selector (store-level or a dedicated hook) so components consume one canonical filtered list (avoids duplicated filter code across grid/list/tabs).

### 3.2 Data normalization
- Tags and Locations are separate tables.
- Menus store `tagIds[]` and `locationIds[]`.
- Menus are shared across all users.
- Favorites are **user-specific** and stored separately (e.g., a `menuFavorites` table keyed by `userId + menuId`, or a per-user list of favorites).
- Derive counts (for sidebar badges) on the client from the full list.

### 3.3 Backend operations (Supabase)
- **Reads**
  - Implement a single bootstrap read model endpoint (`GET /api/bootstrap`) that returns the denormalized shape the UI needs.
  - The endpoint reads from Postgres using the authenticated user session and applies server-side joins/aggregation.
- **Writes** (Next.js Route Handlers)
  - `POST /api/menus` create menu
  - `PATCH /api/menus/:id` update menu (including archive/unarchive, trash/restore)
  - `POST /api/menus/:id/favorite` toggle favorite
  - `DELETE /api/menus/:id` permanently delete
  - `POST /api/tags` create tag
  - `POST /api/locations` create location
- **Security**
  - Enforce auth at the DB layer with **RLS policies**.
  - Never store favorites on the shared menu row; favorites live in `menu_favorites(user_id, menu_id)`.

### 3.4 Price handling
- Store as integer cents: `pricePerPersonCents?: number`.
- Input is EUR (e.g. `12.50`).
- Convert via deterministic helpers:
  - `eurosStringToCents("12.50") -> 1250`
  - `centsToEurosString(1250) -> "12.50"`
- Always display EUR: `€12.50 / person`.
- If more than 2 decimals are provided, round to the nearest cent using standard rounding.

### 3.5 Clipboard copy behavior
- Copy button copies **menuContent only**.
- Always `stopPropagation()` on the copy button in cards.
- Provide user feedback (toast) when copying succeeds/fails.

### 3.6 UI primitives / shadcn
- The root app currently lacks several shadcn primitives (notably `components/ui/dialog.tsx`).
- We will add required primitives in the main `components/ui/` so dialogs and combobox work consistently across the app:
  - `dialog`, `textarea`, `popover`, `combobox`, `badge`, `scroll-area` (as needed)
- **Note on Base UI vs Radix**: shadCN uses both libraries:
  - **Radix UI** (`@radix-ui/*`) - Used by most components (dialog, popover, dropdown-menu, etc.)
  - Both are unstyled primitive libraries; shadCN provides the styling layer on top

### 3.7 Auth (Supabase Auth — Password, internal tool)
- Use **Supabase Auth** with **email + password**.
- This is an internal tool with 3-4 preset users — no self-registration, no password reset.
- Disable public signups in Supabase, and create users via:
  - Supabase dashboard (manual), or
  - a dev-only admin seed script using the service role key (never shipped to the client).
- App shell behavior:
  - Unauthenticated: show login form (email + password).
  - Authenticated: show the dashboard.
- Protect data via:
  - Next.js middleware route guarding for UX, and
  - Postgres **RLS** for actual enforcement.

### 3.8 Testing philosophy
- This repo currently has no test runner configured.
- Add tests only where they provide strong value early:
  - pure helper functions (price conversions, filtering predicate) can be unit-tested once a test runner exists.
- For UI-heavy work, prefer:
  - deterministic components,
  - TypeScript strictness,
  - runtime guards,
  - and a strong manual QA checklist per ticket.

## 4. Definition of Done (DoD) for every ticket
- Compiles (`pnpm build`) and lints (`pnpm lint`).
- No dead/unused exports.
- Types are correct (no `any` unless truly unavoidable).
- User-visible behavior is verified with a short checklist.
- No “flash of empty state” when switching location/tags/view.

---

# Sprint 1 — Foundation & UI Primitives

## Goal
Prepare the codebase to support dialogs, forms, comboboxes, toasts, and Convex client integration without changing product behavior yet.

## Tickets

### S1-T1: Add missing shadcn UI primitives to root app
- [x] **Scope**
  - [x] Add `components/ui/dialog.tsx` (Radix Dialog wrapper)
  - [x] Add `components/ui/textarea.tsx`
  - [x] Add `components/ui/popover.tsx` (Radix-based)
  - [x] Add `components/ui/combobox.tsx` 
  - [x] Add `components/ui/sonner.tsx` (if using Sonner toasts)
- [x] **Acceptance**
  - [x] `sticky_footer_dialog.tsx` can import dialog primitives from root and render.
- [x] **Notes**
  - [x] Keep styling consistent with existing `button/input/dropdown-menu` patterns.
  - [x] The `combobox` component uses Base UI (`@base-ui/react`), not Radix, but follows the same styling patterns.

### S1-T2: Add required dependencies for forms + toasts + combobox
- [x] **Scope**
  - [x] Add packages used by the "Add Menu" dialog:
    - [x] `react-hook-form`, `zod`, `@hookform/resolvers`
    - [x] `sonner` (toast)
    - [x] Radix packages required by primitives added (e.g., `@radix-ui/react-popover` for popover)
    - [x] `@base-ui/react` (required for the combobox component)
- [x] **Acceptance**
  - [x] Typecheck passes; no duplicate conflicting UI implementations.

### S1-T3: Add a shared clipboard helper + toast integration
- [x] **Scope**
  - [x] Create `lib/clipboard.ts` with `copyTextToClipboard(text)` returning success/failure.
  - [x] Call toasts in the caller (not inside helper) to keep helper pure.
- [x] **Acceptance**
  - [x] A sample button in an isolated component can copy and show a toast.
- [ ] **Tests**
  - [ ] None (browser APIs).

### S1-T4: Add EUR price conversion helpers
- [x] **Scope**
  - [x] Create `lib/money.ts` with `eurosStringToCents` and `centsToEurosString`.
  - [x] Handle edge cases: empty string, commas vs dots, leading/trailing spaces.
- [x] **Acceptance**
  - [x] Helper functions used in a small dev-only harness or via console sanity checks.
- [ ] **Tests**
  - [ ] Optional later once a test runner exists.

---

# Sprint 2 — Supabase Bootstrap (Client, Auth, Route Guarding)

## Goal
Replace Convex wiring with Supabase wiring while keeping the UI largely unchanged.

At the end of this sprint, the app can:
- sign in/out with Supabase Auth
- guard protected routes
- run without any Convex dependencies

## Tickets

### S2-T1: Add Supabase dependencies
- [x] **Scope**
  - [x] Add `@supabase/supabase-js`.
  - [x] Add `@supabase/ssr` for Next.js App Router cookie/session support.
- [x] **Acceptance**
  - [x] Typecheck passes.

### S2-T2: Add Supabase environment variables + runtime validation
- [ ] **Scope**
  - [ ] Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to local env docs/README as needed.
  - [x] Add a small runtime check that throws a clear error when env vars are missing.
- [x] **Acceptance**
  - [x] App fails fast with a helpful message when env vars are not set.

### S2-T3: Create a browser Supabase client helper
- [x] **Scope**
  - [x] Create a `lib/supabase/browser.ts` helper that exports a singleton Supabase client for client components.
- [x] **Acceptance**
  - [x] Client components can import the helper without creating multiple clients.

### S2-T4: Create a server Supabase client helper (Route Handlers)
- [x] **Scope**
  - [x] Create `lib/supabase/server.ts` using `@supabase/ssr`.
  - [x] Expose helpers for:
    - [x] creating an authenticated server client (reads cookies)
    - [x] reading the current user/session
- [x] **Acceptance**
  - [x] A Route Handler can read the authenticated user.

### S2-T5: Replace `middleware.ts` with Supabase auth route guarding
- [x] **Scope**
  - [x] Implement route protection for:
    - [x] `/`, `/favorites`, `/archive`, `/trash`, `/dev/*`
  - [x] Redirect behavior:
    - [x] unauthenticated -> `/signin`
    - [x] authenticated visiting `/signin` -> `/`
- [x] **Acceptance**
  - [x] You cannot access protected routes without being logged in.

### S2-T6: Update the Sign In page to Supabase Auth
- [x] **Scope**
  - [x] Replace Convex `useAuthActions().signIn(...)` with `supabase.auth.signInWithPassword({ email, password })`.
  - [x] Preserve current UI/UX (loading state, error toast, redirect).
- [x] **Acceptance**
  - [x] Valid credentials sign in successfully.
  - [x] Invalid credentials show a useful error.

### S2-T7: Update Sign Out action to Supabase Auth
- [x] **Scope**
  - [x] Replace Convex sign-out usage with `supabase.auth.signOut()`.
- [x] **Acceptance**
  - [x] Signing out returns you to `/signin`.

### S2-T8: Remove Convex providers from `app/layout.tsx`
- [x] **Scope**
  - [x] Remove `ConvexAuthNextjsServerProvider` wrapper.
  - [x] Remove `ConvexClientProvider` wrapper.
- [x] **Acceptance**
  - [x] App renders with Supabase auth and no Convex providers.

### S2-T9: Remove Convex dependencies and wiring
- [x] **Scope**
  - [x] Remove `convex/` folder usage from the build (and delete it once no longer imported).
  - [x] Remove `convex` and `@convex-dev/auth` deps.
  - [x] Remove Convex-only scripts (e.g. `seed:users` based on Convex) or replace them with Supabase equivalents.
- [x] **Acceptance**
  - [x] `pnpm build` works with zero Convex packages installed.

## Sprint 2 recap (implemented)

- Supabase env validation added (`lib/supabase/env.ts`) and now supports `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred) or `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Supabase client helpers added:
  - `lib/supabase/browser.ts`
  - `lib/supabase/server.ts`
- Auth + route guarding now uses Supabase SSR middleware (`middleware.ts`) and preserves refreshed cookies (including redirects).
- Sign-in/out migrated to Supabase Auth:
  - `app/signin/page.tsx` uses `supabase.auth.signInWithPassword`.
  - Sidebar sign-out uses `supabase.auth.signOut`.
- Convex providers removed from `app/layout.tsx` (Convex provider file is now a passthrough).
- Convex packages removed from dependencies; lint/build confirmed green.
- User seeding moved to Supabase Admin API in `registerUsers.mjs` (requires `SUPABASE_SERVICE_ROLE_KEY`).

---

# Sprint 3 — Supabase DB Schema + RLS (Menus, Tags, Locations, Favorites)

## Goal
Create the authoritative Postgres schema in Supabase and lock it down with RLS.

## Tickets

### S3-T1: Add Supabase migrations workflow to the repo
- [x] **Scope**
  - [x] Add a `supabase/` folder with migrations (Supabase CLI layout).
  - [x] Document the local workflow to apply migrations.
- [x] **Acceptance**
  - [x] A new migration can be added and applied predictably.

### S3-T2: Create core tables (`tags`, `locations`)
- [x] **Scope**
  - [x] Create `tags` and `locations` with:
    - [x] `id uuid` PK
    - [x] `name text` unique
    - [x] `created_at`, `updated_at`
  - [x] Add indexes for `name`.
- [x] **Acceptance**
  - [x] Tables exist and enforce unique names.

### S3-T3: Create `menus` table
- [x] **Scope**
  - [x] Create `menus` with the locked fields and timestamps.
  - [x] Add DB-level constraints for:
    - [x] `status in ('active','archived')`
    - [x] `deleted_at` nullable
  - [x] Add indexes for:
    - [x] `updated_at` (desc-friendly)
    - [x] `status`
    - [x] `deleted_at`
- [x] **Acceptance**
  - [x] Table exists with constraints and indexes.

### S3-T4: Create join tables (`menu_tags`, `menu_locations`)
- [x] **Scope**
  - [x] Create `menu_tags(menu_id, tag_id)` with a composite PK.
  - [x] Create `menu_locations(menu_id, location_id)` with a composite PK.
  - [x] Add cascade rules (delete join rows when menu is deleted).
- [x] **Acceptance**
  - [x] Joining data is possible without duplicates.

### S3-T5: Create favorites table (`menu_favorites`)
- [x] **Scope**
  - [x] Create `menu_favorites(user_id, menu_id)` composite PK.
  - [x] Add FK to `auth.users` and `menus`.
- [x] **Acceptance**
  - [x] A user can favorite/unfavorite a menu without touching the menu row.

### S3-T6: Add `updated_at` triggers
- [x] **Scope**
  - [x] Add a reusable trigger function to keep `updated_at` correct.
  - [x] Attach it to `menus`, `tags`, `locations`.
- [x] **Acceptance**
  - [x] Updating a row updates `updated_at` automatically.

### S3-T7: Enable RLS + policies (authenticated users)
- [x] **Scope**
  - [x] Enable RLS on all app tables.
  - [x] Add policies so that:
    - [x] only authenticated users can read/write menus/tags/locations
    - [x] users can only modify their own favorites
- [x] **Acceptance**
  - [x] Anonymous requests cannot read or write.
  - [x] Authenticated requests work.

### S3-T8: Seed initial tags/locations (dev)
- [x] **Scope**
  - [x] Create a dev-only seed script or SQL seed migration.
  - [x] Ensure seeding is idempotent (safe to run twice).
- [x] **Acceptance**
  - [x] Dev data exists without duplicates.

---

# Sprint 4 — Read Model Bootstrap API (fetch once, filter locally)

## Goal
Provide a single API call that returns the UI’s denormalized “everything needed to render” dataset (prefer lookup tables + join tables, filter locally).

## Tickets

### S4-T1: Define shared TypeScript types for the read model
- [x] **Scope**
  - [x] Generate Supabase DB types and use them as the source of truth.
  - [x] Define read-model types matching UI needs (avoid leaking DB `snake_case` into UI-facing types).
  - [x] Define `Menu`, `Tag`, `Location`, and `BootstrapPayload` types.
  - [x] Include `imageUrl` and `isFavorite` on the menu read model.
  - [x] Include `createdAt` and `updatedAt` on menus (canonical sort keys).
- [x] **Acceptance**
  - [x] UI code can type-check end-to-end using these types.
  - [x] A clear mapping exists between DB row types and read-model types.

### S4-T2: Implement `GET /api/bootstrap` Route Handler
- [x] **Scope**
  - [x] Create a route handler that:
    - [x] verifies auth (server-side) and returns JSON `401` (no redirects)
    - [x] reads menus + tags + locations + join tables + favorites
    - [x] returns a payload shape that avoids N+1 queries (prefer lookup tables + join tables / ids)
    - [x] includes `isFavorite` for the current user (or a favorites list to compute it)
    - [x] maps DB `snake_case` columns to read-model `camelCase`
  - [x] Return sorted menus by `updatedAt desc`, then `title`.
  - [x] Ensure response caching behavior is explicit (e.g. no-store) so “fetch once” is a client concern.
- [x] **Acceptance**
  - [x] One HTTP request returns all data needed to render the dashboard.
  - [x] Unauthenticated requests receive a JSON `401`.

### S4-T3: Add a client hook to load bootstrap data once
- [x] **Scope**
  - [x] Create `hooks/use-bootstrap-data.ts` that:
    - [x] fetches `/api/bootstrap` once
    - [x] exposes loading/error/data
    - [x] exposes `refresh()` (even if unused in Sprint 4)
  - [x] Ensure there’s no “flash of empty state” after first load (cache the successful payload in memory).
  - [x] Multiple components using the hook do not trigger multiple fetches.
- [x] **Acceptance**
  - [x] Filter clicks stay instant because filtering is local.

### S4-T4: Replace the Sprint 2 dev harness page with a Supabase harness
- [x] **Scope**
  - [x] Update the dev page to call `/api/bootstrap`.
  - [x] Render counts and raw JSON for sanity checks.
- [x] **Acceptance**
  - [x] Dev harness proves data loading works without Convex.

---

# Sprint 5 — Replace Bookmarks Domain with Menus Domain (read-only)

## Goal
Swap the UI from mock bookmarks to real menus, while preserving instant filtering.

## Tickets

### S5-T0: Remove sidebar search UI (use header search only)
- [x] **Scope**
  - [x] Remove the search input from the sidebar.
  - [x] Keep a single canonical search input in the header wired to Zustand UI state.
- [x] **Acceptance**
  - [x] Search UX is consistent (no duplicate search bars).

### S5-T1: Rename domain types and UI copy (Bookmarks -> Menus)
- [x] **Scope**
  - [x] Replace `Bookmark` types with `Menu` types.
  - [x] Update visible labels (Bookmarks -> Menus; Collections -> Locations).
  - [x] Keep `/favorites`, `/archive`, and `/trash` temporarily bookmark-based and isolated from the new menus data model (until Sprint 10).
- [x] **Acceptance**
  - [x] UI text matches the new domain.

### S5-T2: Split UI state store from server data
- [x] **Scope**
  - [x] Keep Zustand for UI state only.
  - [x] Move server-loaded data (menus/tags/locations) into a dedicated hook/context built on top of `useBootstrapData()`.
  - [x] Create a small read-model adapter (best guess: `useMenusModel`) that provides lookup maps and derived values to keep components simple.
- [x] **Acceptance**
  - [x] UI state changes do not refetch data.

### S5-T3: Implement a canonical `getFilteredMenus` selector
- [x] **Scope**
  - [x] Implement filtering + sorting for:
    - [x] location (All / Unassigned / specific location)
    - [x] tag multi-filter
    - [x] search (title + description only)
    - [x] favorites / with-tags / without-tags
    - [x] sorting (best guess: keep existing sort modes but map them to menus)
      - [x] date-newest: `updatedAt desc`, then `title`
      - [x] date-oldest: `updatedAt asc`, then `title`
      - [x] alpha-az: `title asc`, then `updatedAt desc`
      - [x] alpha-za: `title desc`, then `updatedAt desc`
- [x] **Acceptance**
  - [ ] Grid/list/tabs use the same selector output.

### S5-T4: Replace sidebar collections with real locations
- [x] **Scope**
  - [x] Sidebar renders locations from bootstrap payload.
  - [x] Selected location stored in Zustand.
  - [x] Clicking a location clears tag selection.
  - [x] Compute sidebar counts client-side from menus (no hardcoded counts).
- [x] **Acceptance**
  - [x] Switching locations is instant after initial load.

### S5-T5: Replace tag chips with real tags
- [x] **Scope**
  - [x] Tag chips come from bootstrap payload.
  - [x] Keep toggle UX.
- [x] **Acceptance**
  - [x] Tag filtering is instant.

### S5-T6: Replace list/grid content with real menus
- [x] **Scope**
  - [x] Render menu cards from the canonical filtered list.
  - [x] Remove mock bookmarks usage from content components.
  - [x] Keep menu rendering minimal in Sprint 5 (best guess: a simple menu list/grid item component that only renders title + description).
  - [x] Do not refactor `BookmarkCard` in Sprint 5; defer the deeper card refactor (replacing URL/favicon behaviors, copy/price/image UI) to Sprint 7.
- [x] **Acceptance**
  - [x] The dashboard renders Supabase-backed menus.
  - [x] The home dashboard does not import `mock-data/bookmarks`.

---

# Sprint 6 — Supabase Storage (Menu Images)

## Goal
Support optional menu images via Supabase Storage.

## Tickets

### S6-T1: Create Storage bucket + policies
- [x] **Scope**
  - [x] Create a `menu-images` bucket.
  - [x] Bucket access model: **public**.
  - [x] Restrict upload/delete to authenticated users via server route (`POST/DELETE /api/menu-images`) using the service role key.
  - [x] Add upload restrictions (max file size + allowed MIME types).
  - [x] Implement bucket creation/restrictions as a SQL migration (not just manual dashboard config).
- [x] **Acceptance**
  - [x] Uploading a file works and access is correctly restricted.

### S6-T2: Confirm `menus.image_path` semantics
- [x] **Scope**
  - [x] Ensure `menus.image_path` exists and is nullable.
  - [x] Store a **storage object path** (not a full URL) in `image_path`.
- [x] **Acceptance**
  - [x] A menu can be created with or without an image.

### S6-T3: Add a Supabase upload helper
- [x] **Scope**
  - [x] Replace `lib/convex-upload.ts` with a Supabase-based helper.
  - [x] Support:
    - [x] upload
    - [x] delete
    - [x] deriving display URL (public)
  - [x] Path convention: `menus/<menuId>/<uuid>.<ext>`.
  - [x] Best-effort replace behavior (upload new, persist new path, delete old).
- [x] **Acceptance**
  - [x] Helper can upload a file and return a stable `image_path` reference.

### S6-T4: Update Next.js image remote config for Supabase Storage
- [x] **Scope**
  - [x] Update `next.config.ts` `images.remotePatterns` to include the Supabase storage host (`<project-ref>.supabase.co`).
- [x] **Acceptance**
  - [x] Next `<Image />` can render stored images.

### S6-T5: Derive `imageUrl` for menus in bootstrap payload
- [x] **Scope**
  - [x] In `GET /api/bootstrap`, map `menus.image_path` to a public display URL.
  - [x] Keep `menus.image_path` as the persisted reference; do not store public URLs in DB.
- [x] **Acceptance**
  - [x] Menus with images render with a valid `imageUrl` in the UI.

---

# Sprint 7 — Menu Cards UX (grid/list), Copy, and Price

## Goal
Implement the requested card UI changes and copy behavior.

## Tickets

### S7-T0: Refactor bookmark cards into menu cards (deferred from Sprint 5)
- [x] **Scope**
  - [x] Replace `BookmarkCard` usage with a `MenuCard` (or equivalent) that renders menu fields.
  - [x] Remove bookmark-only behaviors (open URL, copy URL, favicon assumptions).
  - [x] Ensure grid and row variants are supported.
  - [x] Card click behavior (temporary, pre-Sprint 8): make the card a single clear click target, but do not implement/open a dialog yet.
  - [x] Keep a heart icon/button slot in the UI but keep it **dead** for now (no persistence, no local toggling).
- [x] **Acceptance**
  - [x] The dashboard renders menus using a menu-native card component.
  - [x] Grid and row variants both look correct and are usable.

### S7-T1: Grid card image slot (optional)
- [x] **Scope**
  - [x] Render menu image when present.
  - [x] Render a consistent placeholder when missing.
  - [x] Use the derived `imageUrl` from the bootstrap read model (do not build storage URLs in the card).
- [x] **Acceptance**
  - [x] Grid card renders correctly in light/dark mode.

### S7-T2: Add Copy button to grid card top-right (left of heart)
- [x] **Scope**
  - [x] Copy `menuContent` only.
  - [x] `stopPropagation()` so it doesn’t open the dialog.
  - [x] Toast feedback (success + failure).
- [x] **Acceptance**
  - [x] Copy works; card still opens dialog when clicking elsewhere.

### S7-T3: Show optional `€X / person` in grid card bottom-right
- [x] **Scope**
  - [x] Display only when `pricePerPersonCents` exists.
  - [x] Format: `€12.00 / person` (always show 2 decimals).
- [x] **Acceptance**
  - [x] Correct formatting and positioning.

### S7-T4: Row view copy + price placement
- [x] **Scope**
  - [x] Add copy button to row view.
  - [x] Display price in row view.
- [x] **Acceptance**
  - [x] Row view remains compact and readable.

---

# Sprint 8 — Menu Details Dialog (Sticky Footer)

## Goal
Clicking a menu opens a shadcn sticky-footer dialog with copy action.

## Tickets

### S8-T1: Create `MenuDialogStickyFooter` component
- [x] **Scope**
  - [x] Build a reusable dialog using the sticky footer structure from `sticky_footer_dialog.tsx`.
  - [x] Render:
    - [x] title
    - [x] description (optional)
    - [x] tags + locations chips (use a reusable shadcn-based badge/chip component, e.g. `Badge`)
    - [x] menuContent as plain text (preserve line breaks)
  - [x] Footer includes Copy + Close.
- [x] **Acceptance**
  - [x] Dialog scrolls content; footer stays visible.

### S8-T2: Wire card click to open the dialog
- [x] **Scope**
  - [x] Clicking a card opens dialog.
  - [x] Copy button does not open dialog.
- [x] **Acceptance**
  - [x] Matches expected behavior in both grid and row.

---

# Sprint 9 — Add Menu Dialog (Create flow)

## Goal
Create menus (with tags/locations/price/image) and see them appear immediately in the locally-filtered list.

## Tickets

### S9-T1: Add “Add Menu” button wiring
- [x] **Scope**
  - [x] Replace label in header.
  - [x] Add click handler to open dialog.
- [x] **Acceptance**
  - [x] Button opens a dialog.

### S9-T2: Build Add Menu dialog shell
- [x] **Scope**
  - [x] Create the shadcn `Dialog` shell + sticky layout.
- [x] **Acceptance**
  - [x] Dialog opens and closes cleanly.

### S9-T3: Add form schema + basic fields (title, description, menuContent, status)
- [x] **Scope**
  - [x] Add `react-hook-form` + `zod` schema for required fields.
  - [x] Implement inputs and validation messaging.
  - [x] Clarify and enforce status enum (`active`, `archived`, `trashed`), defaulting to `active` and hiding archive/trash UI unless explicitly needed.
- [x] **Acceptance**
  - [x] Form blocks submit when required fields are missing.
  - [x] Status defaults to `active` and aligns with DB column constraints.

### S9-T4: Implement `POST /api/tags` (create tag)
- [x] **Scope**
  - [x] Add a Route Handler that creates a tag by name (idempotent: return existing when name already exists).
  - [x] Enforce auth (Supabase session) + trim/lowercase names before matching.
  - [x] Rely on DB unique constraint/upsert to guarantee idempotency and handle race conditions.
- [x] **Acceptance**
  - [x] Creating the same tag twice does not create duplicates.
  - [x] Unauthenticated requests are rejected.

### S9-T5: Implement `POST /api/locations` (create location)
- [x] **Scope**
  - [x] Add a Route Handler that creates a location by name (idempotent).
  - [x] Same auth + normalization rules as tags, with unique constraint enforcement.
- [x] **Acceptance**
  - [x] Creating the same location twice does not create duplicates.
  - [x] Unauthenticated requests are rejected.

### S9-T6: Implement Tags picker (combobox + plus + create-new)
- [x] **Scope**
  - [x] Combobox search.
  - [x] Plus to add another tag row.
  - [x] “Add new” calls `POST /api/tags` immediately and selects the created tag.
  - [x] Prevent duplicate selections.
  - [x] Newly created tags appear instantly in the list (optimistic add or lightweight refresh).
- [x] **Acceptance**
  - [x] You can attach multiple tags.
  - [x] Creating a tag surfaces it in the picker without closing the dialog.

### S9-T7: Implement Locations picker (combobox + plus + create-new)
- [x] **Scope**
  - [x] Same behavior as tags but calls `POST /api/locations`.
  - [x] Newly created locations appear instantly in the list (optimistic add or lightweight refresh).
- [x] **Acceptance**
  - [x] You can attach multiple locations.
  - [x] Creating a location surfaces it in the picker without closing the dialog.

### S9-T8: Implement optional price input (EUR UI, cents storage)
- [x] **Scope**
  - [x] Input accepts `12` or `12.50`.
  - [x] Store as cents.
  - [x] Reuse existing money helper (`lib/money.ts`) for parsing/formatting and block negative numbers.
- [x] **Acceptance**
  - [x] Displayed price matches stored cents.

### S9-T9: Implement optional image upload UI
- [x] **Scope**
  - [x] Upload image to Supabase Storage.
  - [x] Support image removal.
  - [x] Reuse Supabase upload helper + enforce client-side size/MIME validation to mirror backend rules.
- [x] **Acceptance**
  - [x] You can add/remove an image before saving.
  - [x] Invalid files are rejected with clear feedback.

### S9-T10: Implement `POST /api/menus` (create menu)
- [x] **Scope**
  - [x] Insert into `menus`.
  - [x] Insert join rows for tags/locations.
  - [x] Persist `image_path` when present.
  - [x] Validate payload (status enum, tag/location IDs, price cents) and return detailed errors for the form.
- [x] **Acceptance**
  - [x] New menu exists in DB with correct relations.
  - [x] Endpoint rejects unauthenticated or invalid requests with descriptive errors.

### S9-T11: Update UI to refresh bootstrap payload after creating a menu
- [x] **Scope**
  - [x] After a successful create:
    - [x] close the dialog
    - [x] refresh bootstrap data (or apply a local optimistic insert)
  - [x] Show loading state on submit, disable submit button, and surface API errors without closing the dialog.
- [x] **Acceptance**
  - [x] Newly created menu appears immediately in the list.
  - [x] Users receive feedback for success/failure and can retry without losing input.

---

# Sprint 10 — Favorites / Archive / Trash parity

## Goal
Port existing “Favorites/Archive/Trash” functionality to Supabase-backed menus.

## Tickets

### S10-T1: Implement favorite toggle (API + UI)
- [x] **Scope**
  - [x] Add `POST /api/menus/[id]/favorite` to toggle the current user’s favorite.
  - [x] Enable favorite toggle in the UI (menu cards and/or menu dialog) and call the endpoint.
  - [x] Update the UI immediately after toggling (optimistic update or refresh bootstrap).
- [x] **Acceptance**
  - [x] Favoriting/unfavoriting is persisted per user.
  - [x] Favorite state updates immediately in the UI.

### S10-T2: Favorites in the bootstrap read model
- [x] **Scope**
  - [x] Ensure `/api/bootstrap` includes `isFavorite` on menus.
- [x] **Acceptance**
  - [x] Favorites filter/page works without extra round-trips.

### S10-T3: Port Favorites page to menus model
- [x] **Scope**
  - [x] Replace bookmark-based Favorites UI/state with Supabase-backed menus.
  - [x] Show only favorited menus (and exclude trashed menus).
- [x] **Acceptance**
  - [x] `/favorites` displays favorited menus.
  - [x] Unfavoriting removes the menu from `/favorites` immediately.

### S10-T4: Implement archive/unarchive API
- [x] **Scope**
  - [x] Add `PATCH /api/menus/[id]` support to update `status`.
- [x] **Acceptance**
  - [x] Archive/unarchive persists and is reflected in the UI.

### S10-T5: Port Archive page to menus model
- [x] **Scope**
  - [x] Replace bookmark-based Archive UI/state with menus where `status = 'archived'` and `deleted_at is null`.
  - [x] Add actions: unarchive, move to trash.
- [x] **Acceptance**
  - [x] `/archive` shows archived menus.
  - [x] Unarchive and move-to-trash actions work and update the UI.

### S10-T6: Implement trash/restore API
- [x] **Scope**
  - [x] Add `PATCH /api/menus/[id]` support to set/clear `deleted_at`.
- [x] **Acceptance**
  - [x] Trash/restore persists and is reflected in the UI.

### S10-T7: Port Trash page to menus model
- [x] **Scope**
  - [x] Replace bookmark-based Trash UI/state with menus where `deleted_at is not null`.
  - [x] Add actions: restore, delete permanently.
- [x] **Acceptance**
  - [x] `/trash` lists trashed menus.
  - [x] Restore works.
  - [x] Delete permanently removes the menu.

### S10-T8: Implement permanent delete API (menu + joins + favorites + image)
- [x] **Scope**
  - [x] Add `DELETE /api/menus/[id]` to permanently delete a menu.
  - [x] If `image_path` exists, delete the associated Storage object in `menu-images` (service role).
- [x] **Acceptance**
  - [x] Deleting removes join rows and favorites references.
  - [x] Associated Storage image is deleted.

### S10-T9: Implement 30-day trash cleanup job (Option A — scheduled Edge Function)
- [x] **Scope**
  - [x] Create an Edge Function that deletes menus with `deleted_at < now() - interval '30 days'`.
  - [x] If `image_path` exists, delete the associated Storage object in `menu-images` before deleting the menu.
  - [x] Schedule it (Supabase scheduled job mechanism).
- [x] **Acceptance**
  - [x] Old trashed menus (and their images) are deleted automatically.

---

# Sprint 11 — Polish, performance, and robustness

## Goal
Make it feel like a premium internal tool: fast, accessible, consistent, resilient.

## Tickets

### S11-T1: Loading/skeleton strategy without breaking SPA feel
- [ ] **Scope**
  - [ ] Only show skeletons on first app load.
  - [ ] Never flash empty state when switching filters.
- [ ] **Acceptance**
  - [ ] Switching location/tags feels instant.

### S11-T2: Keyboard + accessibility pass
- [ ] **Scope**
  - [ ] Dialog focus management.
  - [ ] Combobox keyboard navigation.
  - [ ] Buttons have labels/aria where needed.
- [ ] **Acceptance**
  - [ ] Works well without mouse.

### S11-T3: Error handling pass
- [ ] **Scope**
  - [ ] Copy failures.
  - [ ] Upload failures.
  - [ ] API errors.
  - [ ] “Offline-ish” behavior (graceful messaging).
- [ ] **Acceptance**
  - [ ] No silent failures.

### S11-T4: Visual consistency pass
- [ ] **Scope**
  - [ ] Spacing, typography, and icon sizes are consistent.
  - [ ] Dark mode contrast checks.
- [ ] **Acceptance**
  - [ ] Looks cohesive.

---

## 5. Manual QA checklist (use per ticket)
- Location switching is instant after initial data load.
- Tag toggling is instant.
- Search updates without jank.
- Copy works from:
  - grid card
  - row item
  - menu dialog footer
- Price:
  - optional
  - stored in cents
  - displayed as EUR
- Image:
  - optional
  - grid-only
- Auth:
  - unauthenticated users can’t read/write menus
  - login/logout flows work
