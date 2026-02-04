# E-commerce — Add Product screen (portable)

This folder is a self-contained extraction of the **Add Product** screen from this repo.

## What’s included

- `app/dashboard/(auth)/pages/products/create/*` (route + components)
- `hooks/use-file-upload.ts` (drag/drop + previews)
- `components/ui/*` (shadcn-style UI primitives used by the screen)
- `lib/utils.ts` (for `cn()` + other small helpers)

## Copy into your project

Merge the folders from `portable/ecommerce-add-product/` into your project root:

- `app/` → your `app/`
- `components/` → your `components/` (skip files you already have)
- `hooks/` → your `hooks/` (skip files you already have)
- `lib/` → your `lib/` (if you already have `lib/utils.ts`, merge carefully)

If you don’t use the `@/` import alias, either:

- add it (recommended) in `tsconfig.json` via `compilerOptions.paths`, or
- rewrite the imports in the copied files to relative paths.

## Required packages

Install (or ensure you already have) these dependencies:

```bash
pnpm add react-hook-form zod @hookform/resolvers sonner lucide-react next-themes clsx tailwind-merge class-variance-authority \
  @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-switch
```

## Toasts (Sonner)

This screen calls `toast(...)` from `sonner`. Make sure you render a toaster somewhere (typically in your root layout):

```tsx
import { Toaster } from "@/components/ui/sonner";
// ...
<Toaster position="top-center" richColors />
```

## Dark mode / theme switcher

- The extracted screen will **adapt to dark mode** as long as your app toggles the `.dark` class (and you have the CSS variables/tokens set up).
- The **toggle UI** itself is *not* included in this extraction (it lives in this repo at `components/layout/header/theme-switch.tsx`).
- If you want the same behavior, ensure `next-themes` `ThemeProvider` is configured (similar to this repo’s `app/layout.tsx`) and copy/replace your toggle component accordingly.

## Styling prerequisites

This template assumes:

- Tailwind CSS is set up (this repo uses Tailwind v4 utilities).
- Your global CSS defines the shadcn-style CSS variables (e.g. `--background`, `--border`, `--popover`, etc).

If your project doesn’t already have those tokens, use this repo’s `app/globals.css` + `app/themes.css` as a reference for what’s expected.
