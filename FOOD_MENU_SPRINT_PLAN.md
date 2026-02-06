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
- [ ] **Scope**
  - [ ] Add `@supabase/supabase-js`.
  - [ ] Add `@supabase/ssr` for Next.js App Router cookie/session support.
- [ ] **Acceptance**
  - [ ] Typecheck passes.

### S2-T2: Add Supabase environment variables + runtime validation
- [ ] **Scope**
  - [ ] Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to local env docs/README as needed.
  - [ ] Add a small runtime check that throws a clear error when env vars are missing.
- [ ] **Acceptance**
  - [ ] App fails fast with a helpful message when env vars are not set.

### S2-T3: Create a browser Supabase client helper
- [ ] **Scope**
  - [ ] Create a `lib/supabase/browser.ts` helper that exports a singleton Supabase client for client components.
- [ ] **Acceptance**
  - [ ] Client components can import the helper without creating multiple clients.

### S2-T4: Create a server Supabase client helper (Route Handlers)
- [ ] **Scope**
  - [ ] Create `lib/supabase/server.ts` using `@supabase/ssr`.
  - [ ] Expose helpers for:
    - [ ] creating an authenticated server client (reads cookies)
    - [ ] reading the current user/session
- [ ] **Acceptance**
  - [ ] A Route Handler can read the authenticated user.

### S2-T5: Replace `middleware.ts` with Supabase auth route guarding
- [ ] **Scope**
  - [ ] Implement route protection for:
    - [ ] `/`, `/favorites`, `/archive`, `/trash`, `/dev/*`
  - [ ] Redirect behavior:
    - [ ] unauthenticated -> `/signin`
    - [ ] authenticated visiting `/signin` -> `/`
- [ ] **Acceptance**
  - [ ] You cannot access protected routes without being logged in.

### S2-T6: Update the Sign In page to Supabase Auth
- [ ] **Scope**
  - [ ] Replace Convex `useAuthActions().signIn(...)` with `supabase.auth.signInWithPassword({ email, password })`.
  - [ ] Preserve current UI/UX (loading state, error toast, redirect).
- [ ] **Acceptance**
  - [ ] Valid credentials sign in successfully.
  - [ ] Invalid credentials show a useful error.

### S2-T7: Update Sign Out action to Supabase Auth
- [ ] **Scope**
  - [ ] Replace Convex sign-out usage with `supabase.auth.signOut()`.
- [ ] **Acceptance**
  - [ ] Signing out returns you to `/signin`.

### S2-T8: Remove Convex providers from `app/layout.tsx`
- [ ] **Scope**
  - [ ] Remove `ConvexAuthNextjsServerProvider` wrapper.
  - [ ] Remove `ConvexClientProvider` wrapper.
- [ ] **Acceptance**
  - [ ] App renders with Supabase auth and no Convex providers.

### S2-T9: Remove Convex dependencies and wiring
- [ ] **Scope**
  - [ ] Remove `convex/` folder usage from the build (and delete it once no longer imported).
  - [ ] Remove `convex` and `@convex-dev/auth` deps.
  - [ ] Remove Convex-only scripts (e.g. `seed:users` based on Convex) or replace them with Supabase equivalents.
- [ ] **Acceptance**
  - [ ] `pnpm build` works with zero Convex packages installed.

---

# Sprint 3 — Supabase DB Schema + RLS (Menus, Tags, Locations, Favorites)

## Goal
Create the authoritative Postgres schema in Supabase and lock it down with RLS.

## Tickets

### S3-T1: Add Supabase migrations workflow to the repo
- [ ] **Scope**
  - [ ] Add a `supabase/` folder with migrations (Supabase CLI layout).
  - [ ] Document the local workflow to apply migrations.
- [ ] **Acceptance**
  - [ ] A new migration can be added and applied predictably.

### S3-T2: Create core tables (`tags`, `locations`)
- [ ] **Scope**
  - [ ] Create `tags` and `locations` with:
    - [ ] `id uuid` PK
    - [ ] `name text` unique
    - [ ] `created_at`, `updated_at`
  - [ ] Add indexes for `name`.
- [ ] **Acceptance**
  - [ ] Tables exist and enforce unique names.

### S3-T3: Create `menus` table
- [ ] **Scope**
  - [ ] Create `menus` with the locked fields and timestamps.
  - [ ] Add DB-level constraints for:
    - [ ] `status in ('active','archived')`
    - [ ] `deleted_at` nullable
  - [ ] Add indexes for:
    - [ ] `updated_at` (desc-friendly)
    - [ ] `status`
    - [ ] `deleted_at`
- [ ] **Acceptance**
  - [ ] Table exists with constraints and indexes.

### S3-T4: Create join tables (`menu_tags`, `menu_locations`)
- [ ] **Scope**
  - [ ] Create `menu_tags(menu_id, tag_id)` with a composite PK.
  - [ ] Create `menu_locations(menu_id, location_id)` with a composite PK.
  - [ ] Add cascade rules (delete join rows when menu is deleted).
- [ ] **Acceptance**
  - [ ] Joining data is possible without duplicates.

### S3-T5: Create favorites table (`menu_favorites`)
- [ ] **Scope**
  - [ ] Create `menu_favorites(user_id, menu_id)` composite PK.
  - [ ] Add FK to `auth.users` and `menus`.
- [ ] **Acceptance**
  - [ ] A user can favorite/unfavorite a menu without touching the menu row.

### S3-T6: Add `updated_at` triggers
- [ ] **Scope**
  - [ ] Add a reusable trigger function to keep `updated_at` correct.
  - [ ] Attach it to `menus`, `tags`, `locations`.
- [ ] **Acceptance**
  - [ ] Updating a row updates `updated_at` automatically.

### S3-T7: Enable RLS + policies (authenticated users)
- [ ] **Scope**
  - [ ] Enable RLS on all app tables.
  - [ ] Add policies so that:
    - [ ] only authenticated users can read/write menus/tags/locations
    - [ ] users can only modify their own favorites
- [ ] **Acceptance**
  - [ ] Anonymous requests cannot read or write.
  - [ ] Authenticated requests work.

### S3-T8: Seed initial tags/locations (dev)
- [ ] **Scope**
  - [ ] Create a dev-only seed script or SQL seed migration.
  - [ ] Ensure seeding is idempotent (safe to run twice).
- [ ] **Acceptance**
  - [ ] Dev data exists without duplicates.

---

# Sprint 4 — Read Model Bootstrap API (fetch once, filter locally)

## Goal
Provide a single API call that returns the UI’s denormalized “everything needed to render” dataset.

## Tickets

### S4-T1: Define shared TypeScript types for the read model
- [ ] **Scope**
  - [ ] Define `Menu`, `Tag`, `Location`, and `BootstrapPayload` types matching UI needs.
  - [ ] Include `imageUrl` and `isFavorite` on the menu read model.
- [ ] **Acceptance**
  - [ ] The UI can type-check end-to-end using these types.

### S4-T2: Implement `GET /api/bootstrap` Route Handler
- [ ] **Scope**
  - [ ] Create a route handler that:
    - [ ] verifies auth (server-side)
    - [ ] reads menus + tags + locations
    - [ ] joins tags/locations onto menus (or returns ids plus lookup tables)
    - [ ] includes `isFavorite` for the current user
  - [ ] Return sorted menus by `updatedAt desc`, then `title`.
- [ ] **Acceptance**
  - [ ] One HTTP request returns all data needed to render the dashboard.

### S4-T3: Add a client hook to load bootstrap data once
- [ ] **Scope**
  - [ ] Create `hooks/use-bootstrap-data.ts` that:
    - [ ] fetches `/api/bootstrap` once
    - [ ] exposes loading/error/data
  - [ ] Ensure there’s no “flash of empty state” after first load.
- [ ] **Acceptance**
  - [ ] Filter clicks stay instant because filtering is local.

### S4-T4: Replace the Sprint 2 dev harness page with a Supabase harness
- [ ] **Scope**
  - [ ] Update the dev page to call `/api/bootstrap`.
  - [ ] Render counts and raw JSON for sanity checks.
- [ ] **Acceptance**
  - [ ] Dev harness proves data loading works without Convex.

---

# Sprint 5 — Replace Bookmarks Domain with Menus Domain (read-only)

## Goal
Swap the UI from mock bookmarks to real menus, while preserving instant filtering.

## Tickets

### S5-T1: Rename domain types and UI copy (Bookmarks -> Menus)
- [ ] **Scope**
  - [ ] Replace `Bookmark` types with `Menu` types.
  - [ ] Update visible labels (Bookmarks -> Menus; Collections -> Locations).
- [ ] **Acceptance**
  - [ ] UI text matches the new domain.

### S5-T2: Split UI state store from server data
- [ ] **Scope**
  - [ ] Keep Zustand for UI state only.
  - [ ] Move server-loaded data (menus/tags/locations) into a dedicated hook/context.
- [ ] **Acceptance**
  - [ ] UI state changes do not refetch data.

### S5-T3: Implement a canonical `getFilteredMenus` selector
- [ ] **Scope**
  - [ ] Implement filtering + sorting for:
    - [ ] location (All / Unassigned / specific location)
    - [ ] tag multi-filter
    - [ ] search (title + description)
    - [ ] favorites / with-tags / without-tags
    - [ ] sorting (`updatedAt desc`, then `title`)
- [ ] **Acceptance**
  - [ ] Grid/list/tabs use the same selector output.

### S5-T4: Replace sidebar collections with real locations
- [ ] **Scope**
  - [ ] Sidebar renders locations from bootstrap payload.
  - [ ] Selected location stored in Zustand.
  - [ ] Clicking a location clears tag selection.
- [ ] **Acceptance**
  - [ ] Switching locations is instant after initial load.

### S5-T5: Replace tag chips with real tags
- [ ] **Scope**
  - [ ] Tag chips come from bootstrap payload.
  - [ ] Keep toggle UX.
- [ ] **Acceptance**
  - [ ] Tag filtering is instant.

### S5-T6: Replace list/grid content with real menus
- [ ] **Scope**
  - [ ] Render menu cards from the canonical filtered list.
  - [ ] Remove mock bookmarks usage from content components.
- [ ] **Acceptance**
  - [ ] The dashboard renders Supabase-backed menus.

---

# Sprint 6 — Supabase Storage (Menu Images)

## Goal
Support optional menu images via Supabase Storage.

## Tickets

### S6-T1: Create Storage bucket + policies
- [ ] **Scope**
  - [ ] Create a `menu-images` bucket.
  - [ ] Add policies so that only authenticated users can upload/read (choose public vs signed URLs explicitly).
- [ ] **Acceptance**
  - [ ] Uploading a file works and access is correctly restricted.

### S6-T2: Add `image_path` (or equivalent) to `menus`
- [ ] **Scope**
  - [ ] Add a nullable column on `menus` that references the uploaded file path.
- [ ] **Acceptance**
  - [ ] A menu can be created with or without an image.

### S6-T3: Add a Supabase upload helper
- [ ] **Scope**
  - [ ] Replace `lib/convex-upload.ts` with a Supabase-based helper.
  - [ ] Support:
    - [ ] upload
    - [ ] delete
    - [ ] deriving display URL (public or signed)
- [ ] **Acceptance**
  - [ ] Helper can upload a file and return a stable reference.

### S6-T4: Update Next.js image remote config for Supabase Storage
- [ ] **Scope**
  - [ ] Update `next.config.ts` `images.remotePatterns` to include the Supabase storage host.
- [ ] **Acceptance**
  - [ ] Next `<Image />` can render stored images.

---

# Sprint 7 — Menu Cards UX (grid/list), Copy, and Price

## Goal
Implement the requested card UI changes and copy behavior.

## Tickets

### S7-T1: Grid card image slot (optional)
- [ ] **Scope**
  - [ ] Render menu image when present.
  - [ ] Render a consistent placeholder when missing.
- [ ] **Acceptance**
  - [ ] Grid card renders correctly in light/dark mode.

### S7-T2: Add Copy button to grid card top-right (left of heart)
- [ ] **Scope**
  - [ ] Copy `menuContent` only.
  - [ ] `stopPropagation()` so it doesn’t open the dialog.
  - [ ] Toast feedback.
- [ ] **Acceptance**
  - [ ] Copy works; card still opens dialog when clicking elsewhere.

### S7-T3: Show optional `€X / person` in grid card bottom-right
- [ ] **Scope**
  - [ ] Display only when `pricePerPersonCents` exists.
- [ ] **Acceptance**
  - [ ] Correct formatting and positioning.

### S7-T4: Row view copy + price placement
- [ ] **Scope**
  - [ ] Add copy button to row view.
  - [ ] Display price in row view.
- [ ] **Acceptance**
  - [ ] Row view remains compact and readable.

---

# Sprint 8 — Menu Details Dialog (Sticky Footer)

## Goal
Clicking a menu opens a shadcn sticky-footer dialog with copy action.

## Tickets

### S8-T1: Create `MenuDialogStickyFooter` component
- [ ] **Scope**
  - [ ] Build a reusable dialog using the sticky footer structure from `sticky_footer_dialog.tsx`.
  - [ ] Render:
    - [ ] title
    - [ ] description (optional)
    - [ ] tags + locations chips
    - [ ] menuContent as plain text (preserve line breaks)
  - [ ] Footer includes Copy + Close.
- [ ] **Acceptance**
  - [ ] Dialog scrolls content; footer stays visible.

### S8-T2: Wire card click to open the dialog
- [ ] **Scope**
  - [ ] Clicking a card opens dialog.
  - [ ] Copy button does not open dialog.
- [ ] **Acceptance**
  - [ ] Matches expected behavior in both grid and row.

---

# Sprint 9 — Add Menu Dialog (Create flow)

## Goal
Create menus (with tags/locations/price/image) and see them appear immediately in the locally-filtered list.

## Tickets

### S9-T1: Add “Add Menu” button wiring
- [ ] **Scope**
  - [ ] Replace label in header.
  - [ ] Add click handler to open dialog.
- [ ] **Acceptance**
  - [ ] Button opens a dialog.

### S9-T2: Build Add Menu dialog shell
- [ ] **Scope**
  - [ ] Create the shadcn `Dialog` shell + sticky layout.
- [ ] **Acceptance**
  - [ ] Dialog opens and closes cleanly.

### S9-T3: Add form schema + basic fields (title, description, menuContent, status)
- [ ] **Scope**
  - [ ] Add `react-hook-form` + `zod` schema for required fields.
  - [ ] Implement inputs and validation messaging.
- [ ] **Acceptance**
  - [ ] Form blocks submit when required fields are missing.

### S9-T4: Implement `POST /api/tags` (create tag)
- [ ] **Scope**
  - [ ] Add a Route Handler that creates a tag by name (idempotent: return existing when name already exists).
- [ ] **Acceptance**
  - [ ] Creating the same tag twice does not create duplicates.

### S9-T5: Implement `POST /api/locations` (create location)
- [ ] **Scope**
  - [ ] Add a Route Handler that creates a location by name (idempotent).
- [ ] **Acceptance**
  - [ ] Creating the same location twice does not create duplicates.

### S9-T6: Implement Tags picker (combobox + plus + create-new)
- [ ] **Scope**
  - [ ] Combobox search.
  - [ ] Plus to add another tag row.
  - [ ] “Add new” calls `POST /api/tags` immediately and selects the created tag.
  - [ ] Prevent duplicate selections.
- [ ] **Acceptance**
  - [ ] You can attach multiple tags.

### S9-T7: Implement Locations picker (combobox + plus + create-new)
- [ ] **Scope**
  - [ ] Same behavior as tags but calls `POST /api/locations`.
- [ ] **Acceptance**
  - [ ] You can attach multiple locations.

### S9-T8: Implement optional price input (EUR UI, cents storage)
- [ ] **Scope**
  - [ ] Input accepts `12` or `12.50`.
  - [ ] Store as cents.
- [ ] **Acceptance**
  - [ ] Displayed price matches stored cents.

### S9-T9: Implement optional image upload UI
- [ ] **Scope**
  - [ ] Upload image to Supabase Storage.
  - [ ] Support image removal.
- [ ] **Acceptance**
  - [ ] You can add/remove an image before saving.

### S9-T10: Implement `POST /api/menus` (create menu)
- [ ] **Scope**
  - [ ] Insert into `menus`.
  - [ ] Insert join rows for tags/locations.
  - [ ] Persist `image_path` when present.
- [ ] **Acceptance**
  - [ ] New menu exists in DB with correct relations.

### S9-T11: Update UI to refresh bootstrap payload after creating a menu
- [ ] **Scope**
  - [ ] After a successful create:
    - [ ] close the dialog
    - [ ] refresh bootstrap data (or apply a local optimistic insert)
- [ ] **Acceptance**
  - [ ] Newly created menu appears immediately in the list.

---

# Sprint 10 — Favorites / Archive / Trash parity

## Goal
Port existing “Favorites/Archive/Trash” functionality to Supabase-backed menus.

## Tickets

### S10-T1: Implement favorite toggle API
- [ ] **Scope**
  - [ ] Add `POST /api/menus/:id/favorite` to toggle the current user’s favorite.
- [ ] **Acceptance**
  - [ ] Favoriting/unfavoriting is persisted per user.

### S10-T2: Add favorites to the bootstrap read model
- [ ] **Scope**
  - [ ] Ensure `/api/bootstrap` includes `isFavorite` on menus.
- [ ] **Acceptance**
  - [ ] Favorites filter/page works without extra round-trips.

### S10-T3: Implement archive/unarchive API
- [ ] **Scope**
  - [ ] Add `PATCH /api/menus/:id` support to update `status`.
- [ ] **Acceptance**
  - [ ] Archive page shows archived menus.

### S10-T4: Implement trash/restore API
- [ ] **Scope**
  - [ ] Add `PATCH /api/menus/:id` support to set/clear `deleted_at`.
- [ ] **Acceptance**
  - [ ] Trash page lists trashed menus; restore works.

### S10-T5: Implement permanent delete API (menu + joins + favorites)
- [ ] **Scope**
  - [ ] Add `DELETE /api/menus/:id` to permanently delete a menu.
- [ ] **Acceptance**
  - [ ] Deleting removes join rows and favorites references.

### S10-T6: Implement 30-day trash cleanup job
- [ ] **Scope**
  - [ ] Add a SQL function that deletes menus with `deleted_at < now() - interval '30 days'`.
  - [ ] Schedule it (Supabase cron / scheduled job mechanism).
  - [ ] If images exist, ensure associated Storage objects are cleaned up.
- [ ] **Acceptance**
  - [ ] Old trashed menus are deleted automatically.

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
