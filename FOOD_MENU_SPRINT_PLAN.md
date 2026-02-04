# Food Menu Manager (Convex + Shadcn) — Sprint Plan

## 0. Product summary

You are building a **single-page (SPA-feel) Food Menu manager** for an event company oout of the Bookmark Manager Template.

- **Menus** are the core entity (replaces bookmarks).
- **Locations** replace bookmark collections.
- **Tags** remain as they are (but become real DB entities, not mock data).
- **Backend**: Convex (database, storage, server functions).
- **Auth**: Convex Auth with **Google login**.
- **UX goal**: Selecting a new location / tags / view mode must feel **instant**.
  - We will use **SPA Option A**: fetch **all menus** once, then filter locally.

## 1. Requirements (locked)

### 1.1 Menus
- **Fields**
  - `title` (required)
  - `description` (optional)
  - `menuContent` (required, plain text)
  - `pricePerPersonCents` (optional; stored as integer cents; input/edit shown as EUR)
  - `image` (optional; stored in Convex storage; grid view shows it, row view does not)
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
- Use **Convex `useQuery`** to fetch:
  - `menus:listAll` (all shared menus, plus `isFavorite` resolved for the current user)
  - `tags:listAll`
  - `locations:listAll`
- Compute filtered menus **locally** using memoized selectors (`useMemo` or store selector) to keep clicks instant.
  - Filtering logic should live in a single shared selector (store-level or a dedicated hook) so components consume one canonical filtered list (avoids duplicated filter code across grid/list/tabs).

### 3.2 Data normalization
- Tags and Locations are separate tables.
- Menus store `tagIds[]` and `locationIds[]`.
- Menus are shared across all users.
- Favorites are **user-specific** and stored separately (e.g., a `menuFavorites` table keyed by `userId + menuId`, or a per-user list of favorites).
- Derive counts (for sidebar badges) on the client from the full list.

### 3.3 Convex functions
- Queries return only what the UI needs (avoid overfetch), but because we fetch “all menus”, we should keep menu objects lean.
- Mutations:
  - create menu
  - update menu
  - toggle favorite
  - archive/unarchive
  - trash/restore
  - permanently delete
  - create tag / create location
  - Enforce user-specific favorites in mutations (never store favorites on the shared menu document).

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
  - **Base UI** (`@base-ui/react`) - Used specifically by the `combobox` component
  - Both are unstyled primitive libraries; shadCN provides the styling layer on top

### 3.7 Auth (Google via Convex)
- Use **Convex Auth** with Google OAuth.
- App shell behavior:
  - Unauthenticated: show login screen.
  - Authenticated: show the dashboard.
- Protect Convex functions by checking identity in queries/mutations.

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
- [ ] **Scope**
  - [ ] Add `components/ui/dialog.tsx` (Radix Dialog wrapper)
  - [ ] Add `components/ui/textarea.tsx`
  - [ ] Add `components/ui/popover.tsx` (Radix-based)
  - [ ] Add `components/ui/combobox.tsx` (Base UI-based standalone component)
  - [ ] Add `components/ui/sonner.tsx` (if using Sonner toasts)
- [ ] **Acceptance**
  - [ ] `sticky_footer_dialog.tsx` can import dialog primitives from root and render.
- [ ] **Notes**
  - [ ] Keep styling consistent with existing `button/input/dropdown-menu` patterns.
  - [ ] The `combobox` component uses Base UI (`@base-ui/react`), not Radix, but follows the same styling patterns.

### S1-T2: Add required dependencies for forms + toasts + combobox
- [ ] **Scope**
  - [ ] Add packages used by the "Add Menu" dialog:
    - [ ] `react-hook-form`, `zod`, `@hookform/resolvers`
    - [ ] `sonner` (toast)
    - [ ] Radix packages required by primitives added (e.g., `@radix-ui/react-popover` for popover)
    - [ ] `@base-ui/react` (required for the combobox component)
- [ ] **Acceptance**
  - [ ] Typecheck passes; no duplicate conflicting UI implementations.

### S1-T3: Add a shared clipboard helper + toast integration
- [ ] **Scope**
  - [ ] Create `lib/clipboard.ts` with `copyTextToClipboard(text)` returning success/failure.
  - [ ] Call toasts in the caller (not inside helper) to keep helper pure.
- [ ] **Acceptance**
  - [ ] A sample button in an isolated component can copy and show a toast.
- [ ] **Tests**
  - [ ] None (browser APIs).

### S1-T4: Add EUR price conversion helpers
- [ ] **Scope**
  - [ ] Create `lib/money.ts` with `eurosStringToCents` and `centsToEurosString`.
  - [ ] Handle edge cases: empty string, commas vs dots, leading/trailing spaces.
- [ ] **Acceptance**
  - [ ] Helper functions used in a small dev-only harness or via console sanity checks.
- [ ] **Tests**
  - [ ] Optional later once a test runner exists.

---

# Sprint 2 — Convex Integration (DB, Storage, Client Provider)

## Goal
Introduce Convex and fetch read-only data from it (still okay to keep current UI mock until the end of this sprint).

## Tickets

### S2-T1: Add Convex to the project
- [ ] **Scope**
  - [ ] Initialize Convex project folder (`convex/`), schema, and generated types.
  - [ ] Add Convex client provider to Next.js app (root layout wrapper).
- [ ] **Acceptance**
  - [ ] App boots with Convex configured.

### S2-T2: Implement Convex schema (menus, tags, locations)
- [ ] **Scope**
  - [ ] `menus`, `tags`, `locations` tables.
  - [ ] Include indexes for common access patterns (by owner, status, etc.).
- [ ] **Acceptance**
  - [ ] Schema deploy succeeds.

### S2-T3: Implement read queries
- [ ] **Scope**
  - [ ] `menus:listAll` (for SPA option A)
  - [ ] `tags:listAll`
  - [ ] `locations:listAll`
- [ ] **Acceptance**
  - [ ] Simple dev page/component can render counts from queries.

### S2-T4: Implement storage upload primitives for menu images
- [ ] **Scope**
  - [ ] Server-side: function(s) to generate upload URLs and store the resulting file id on a menu.
  - [ ] Client-side: minimal upload helper that can upload and receive a storage id.
  - [ ] Support image removal by clearing the image id and deleting the old storage object.
- [ ] **Acceptance**
  - [ ] Can upload one image and persist it.

---

# Sprint 3 — Auth (Convex Auth + Google)

## Goal
Require login and associate **user-specific data** (favorites, future per-user settings) with a user identity.

## Tickets

### S3-T1: Add Convex Auth (Google OAuth) setup
- [ ] **Scope**
  - [ ] Add Convex Auth configuration per official docs.
  - [ ] Add environment variables for Google OAuth.
- [ ] **Acceptance**
  - [ ] You can sign in with Google in dev.

### S3-T2: Add Login UI and App gating
- [ ] **Scope**
  - [ ] Add a login page/component.
  - [ ] App shell shows:
    - [ ] login when unauthenticated
    - [ ] dashboard when authenticated
- [ ] **Acceptance**
  - [ ] Unauthed users cannot access menus data.

### S3-T3: Secure Convex functions
- [ ] **Scope**
  - [ ] Update queries/mutations to verify identity.
  - [ ] Ensure no cross-user reads/writes of **user-specific** data (favorites, etc.).
- [ ] **Acceptance**
  - [ ] Attempts to access data without auth fail safely.

---

# Sprint 4 — Replace Bookmarks Domain with Menus Domain (read-only)

## Goal
Swap the UI from mock bookmarks to real menus, while preserving instant filtering.

## Tickets

### S4-T1: Rename domain types and stores (Bookmarks -> Menus)
- [ ] **Scope**
  - [ ] Replace `Bookmark` types with `Menu` types.
  - [ ] Rename store: `useBookmarksStore` -> `useMenusStore` (UI state only).
  - [ ] Rename text labels (Bookmarks -> Menus; Collections -> Locations).
- [ ] **Acceptance**
  - [ ] App compiles and UI labels match the new domain.

### S4-T2: Replace sidebar collections with Convex locations
- [ ] **Scope**
  - [ ] Sidebar loads locations via `useQuery`.
  - [ ] Selected location stored in Zustand.
  - [ ] Clicking a location clears tag selection (same behavior as today).
- [ ] **Acceptance**
  - [ ] Switching locations changes the menu list instantly after initial load.

### S4-T3: Replace tags mock with Convex tags
- [ ] **Scope**
  - [ ] Tag chips come from Convex.
  - [ ] Keep “toggle tag” UX.
- [ ] **Acceptance**
  - [ ] Tag filtering is instant.

### S4-T4: Replace list/grid content with Convex menus + local filtering
- [ ] **Scope**
  - [ ] `menus:listAll` provides the canonical list.
  - [ ] Filtering logic moved to a local selector that uses:
    - [ ] selected location (match if `menu.locationIds` includes it)
    - [ ] selected tags (any tag match)
    - [ ] search query (title + description)
    - [ ] favorites/with-tags/without-tags
    - [ ] sorting
- [ ] **Acceptance**
  - [ ] No noticeable “load” when changing filters.

---

# Sprint 5 — Menu Cards UX (grid/list), Copy, and Price

## Goal
Implement the requested card UI changes and copy behavior.

## Tickets

### S5-T1: Grid card image slot (optional)
- [ ] **Scope**
  - [ ] Replace favicon rendering with:
    - [ ] menu image (from Convex storage) if present
    - [ ] fallback placeholder if not
- [ ] **Acceptance**
  - [ ] Grid card renders correctly in light/dark mode.

### S5-T2: Add Copy button to grid card top-right (left of heart)
- [ ] **Scope**
  - [ ] Button copies `menuContent`.
  - [ ] `stopPropagation()` so it doesn’t open the dialog.
  - [ ] Toast feedback.
- [ ] **Acceptance**
  - [ ] Copy works; card still opens dialog when clicking elsewhere.

### S5-T3: Show optional `€X / person` in grid card bottom-right
- [ ] **Scope**
  - [ ] Display only when `pricePerPersonCents` exists.
- [ ] **Acceptance**
  - [ ] Correct formatting and positioning.

### S5-T4: Row view copy + price placement
- [ ] **Scope**
  - [ ] Add copy button to row view.
  - [ ] Replace URL display with price (or add a price pill near title).
- [ ] **Acceptance**
  - [ ] Row view remains compact and readable.

---

# Sprint 6 — Menu Details Dialog (Sticky Footer)

## Goal
Clicking a menu opens a shadcn sticky-footer dialog with copy action.

## Tickets

### S6-T1: Create `MenuDialogStickyFooter` component
- [ ] **Scope**
  - [ ] Build a reusable dialog using the sticky footer structure from `sticky_footer_dialog.tsx`.
  - [ ] Content includes:
    - [ ] title
    - [ ] description (optional)
    - [ ] tags + locations chips
    - [ ] menuContent rendered as plain text (preserve line breaks)
  - [ ] Footer includes:
    - [ ] Copy
    - [ ] Close
- [ ] **Acceptance**
  - [ ] Dialog scrolls content; footer stays visible.

### S6-T2: Wire card click to open the dialog (instead of external link)
- [ ] **Scope**
  - [ ] Clicking a card opens dialog.
  - [ ] Copy button does not open dialog.
- [ ] **Acceptance**
  - [ ] Matches expected behavior in both grid and row.

---

# Sprint 7 — Add Menu Dialog (Create flow)

## Goal
Replace broken Add Bookmark with a working Add Menu dialog inspired by ecommerce-add-product.

## Tickets

### S7-T1: Add “Add Menu” button wiring
- [ ] **Scope**
  - [ ] Replace label in header.
  - [ ] Add click handler to open dialog.
- [ ] **Acceptance**
  - [ ] Button opens a dialog.

### S7-T2: Build Add Menu dialog shell + form scaffolding
- [ ] **Scope**
  - [ ] shadcn `Dialog` + layout matching the app.
  - [ ] `react-hook-form` + `zod` schema.
- [ ] **Acceptance**
  - [ ] Form validates required fields and can submit (even if mutation is stubbed).

### S7-T3: Implement Locations picker (combobox + plus + create-new)
- [ ] **Scope**
  - [ ] Combobox search.
  - [ ] Plus to add another location row.
  - [ ] Plus inside picker to create a new location.
  - [ ] Ensure no duplicate selections.
- [ ] **Acceptance**
  - [ ] You can attach multiple locations.

### S7-T4: Implement Tags picker (combobox + plus + create-new)
- [ ] **Scope**
  - [ ] Same behavior as locations.
- [ ] **Acceptance**
  - [ ] You can attach multiple tags.

### S7-T5: Implement optional price input (EUR UI, cents storage)
- [ ] **Scope**
  - [ ] Input accepts `12` or `12.50`.
  - [ ] Stored as cents.
- [ ] **Acceptance**
  - [ ] Displayed price matches stored cents.

### S7-T6: Implement optional image upload to Convex storage
- [ ] **Scope**
  - [ ] Upload UI can be simplified from `ecommerce-add-product`.
  - [ ] Associate uploaded image with menu.
  - [ ] Image deletion is supported (clear the image id + delete old storage object, following the app’s usual handling).
- [ ] **Acceptance**
  - [ ] Newly created menu shows image in grid view.

### S7-T7: Implement create menu mutation + optimistic UI
- [ ] **Scope**
  - [ ] Mutation creates menu.
  - [ ] Dialog closes on success.
  - [ ] The new menu appears instantly in the list (Convex reactivity + local filtering).
- [ ] **Acceptance**
  - [ ] Create flow works end-to-end.

---

# Sprint 8 — Favorites / Archive / Trash parity

## Goal
Port existing bookmark “Favorites/Archive/Trash” pages to menus.

## Tickets

### S8-T1: Favorites behavior
- [ ] **Scope**
  - [ ] Toggle favorite mutation.
  - [ ] Favorites page shows favorited menus.
  - [ ] Favorites are stored per user (do not write `isFavorite` on the shared menu doc).
- [ ] **Acceptance**
  - [ ] Favorites page matches existing UX.

### S8-T2: Archive behavior
- [ ] **Scope**
  - [ ] Archive/unarchive mutation.
  - [ ] Archive page lists archived menus.
- [ ] **Acceptance**
  - [ ] Archive actions work.

### S8-T3: Trash behavior
- [ ] **Scope**
  - [ ] Trash mutation sets `deletedAt`.
  - [ ] Trash page lists trashed menus.
  - [ ] Restore and permanent delete.
  - [ ] Permanently delete after 30 days in trash.
- [ ] **Acceptance**
  - [ ] Trash workflow works.

---

# Sprint 9 — Polish, performance, and “AAA” finish

## Goal
Make it feel like a premium product: performance, consistency, accessibility, and robustness.

## Tickets

### S9-T1: Loading/skeleton strategy without breaking SPA feel
- [ ] **Scope**
  - [ ] Only show skeletons on first app load.
  - [ ] Never flash empty state when switching filters.
- [ ] **Acceptance**
  - [ ] Switching location/tags feels instant.

### S9-T2: Keyboard + accessibility pass
- [ ] **Scope**
  - [ ] Dialog focus management.
  - [ ] Combobox keyboard nav.
  - [ ] Buttons have labels/aria where needed.
- [ ] **Acceptance**
  - [ ] Works well without mouse.

### S9-T3: Error handling pass
- [ ] **Scope**
  - [ ] Copy failures
  - [ ] Upload failures
  - [ ] Mutation errors
  - [ ] Offline-ish behavior (graceful messaging)
- [ ] **Acceptance**
  - [ ] No silent failures.

### S9-T4: Visual consistency pass
- [ ] **Scope**
  - [ ] Spacing, typography, and icon sizes are consistent.
  - [ ] Dark mode contrast checks.
- [ ] **Acceptance**
  - [ ] Looks like one cohesive product.

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
