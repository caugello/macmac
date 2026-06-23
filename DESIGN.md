# Design System: Ivory Flux

Source of truth for issue #272 (Apply Ivory Flux design system to frontend).
Token values pulled from the Stitch "Ivory Flux" design system (displayName: `Ivory Flux`).

## Brand Persona

A premium, editorial, high-fidelity theme built on modern editorial design and
ethereal layering. It evolves the depth of the "Obsidian" predecessor into a
light, airy experience: **Minimalism + Glassmorphism** with organic warmth —
ivory tones and terracotta accents over sterile white.

- **Spatial depth:** semi-transparent surfaces + multi-layered ambient shadows.
- **Architectural clarity:** large, confident type + expansive whitespace.
- **Organic warmth:** ivory base, terracotta accent, slate secondary.

---

## Color Palette

Authoritative mapping of `frontend/src/index.css` `:root` vars → Ivory Flux hex.
Apply exactly. **Nutri-Score vars (`--nutri-*`) are unchanged.**

| CSS var | Ivory Flux value | Was (Terracotta) |
|---|---|---|
| `--background` | `#fff8f6` | `#fef7f4` |
| `--foreground` | `#231917` | `#201a17` |
| `--card` | `#ffffff` | `#ffffff` |
| `--card-foreground` | `#231917` | `#201a17` |
| `--popover` | `#ffffff` | `#ffffff` |
| `--popover-foreground` | `#231917` | `#201a17` |
| `--primary` | `#9d3d2c` | `#9c4323` |
| `--primary-foreground` | `#ffffff` | `#ffffff` |
| `--primary-container` | `#bd5541` | `#ffdbd0` |
| `--on-primary-container` | `#fffbff` | `#7a2e12` |
| `--secondary` | `#555f6f` | `#77574b` |
| `--secondary-foreground` | `#ffffff` | `#ffffff` |
| `--secondary-container` | `#d6e0f3` | `#ffdbd0` |
| `--on-secondary-container` | `#596373` | `#5d4037` |
| `--muted` | `#f2dedb` | `#f5ded7` |
| `--muted-foreground` | `#56423e` | `#6f5b53` |
| `--accent` | `#5b5c5a` | `#6c5d2f` |
| `--accent-foreground` | `#ffffff` | `#ffffff` |
| `--destructive` | `#ba1a1a` | `#ba1a1a` |
| `--destructive-foreground` | `#ffffff` | `#ffffff` |
| `--error-container` | `#ffdad6` | `#ffdad6` |
| `--on-error-container` | `#93000a` | `#410002` |
| `--border` | `#ddc0bb` | `#d8c2ba` |
| `--input` | `#ddc0bb` | `#d8c2ba` |
| `--ring` | `#9d3d2c` | `#9c4323` |
| `--radius` | `0.5rem` (unchanged) | `0.5rem` |
| `--surface` | `#fff8f6` | `#fef7f4` |
| `--surface-dim` | `#e9d6d2` | `#e0d9d5` |
| `--surface-bright` | `#fff8f6` | `#fef7f4` |
| `--surface-tint` | `#a03f2e` | `#9c4323` |
| `--surface-container-lowest` | `#ffffff` | `#ffffff` |
| `--surface-container-low` | `#fff0ee` | `#faf1ed` |
| `--surface-container` | `#feeae6` | `#f4ebe7` |
| `--surface-container-high` | `#f8e4e0` | `#eee6e1` |
| `--surface-container-highest` | `#f2dedb` | `#e8e0dc` |
| `--surface-variant` | `#f2dedb` | `#f5ded7` |
| `--outline` | `#89726d` | `#a08c85` |
| `--outline-variant` | `#ddc0bb` | `#d8c2ba` |
| `--inverse-surface` | `#392e2b` | `#362f2c` |
| `--inverse-on-surface` | `#ffede9` | `#fbeeea` |
| `--inverse-primary` | `#ffb4a5` | `#ffb4a0` |
| `--tertiary` | `#5b5c5a` | `#6c5d2f` |
| `--tertiary-container` | `#747572` | `#f6e1a6` |
| `--on-tertiary-container` | `#fdfcf9` | `#534619` |
| `--primary-fixed` | `#ffdad3` | `#ffdbd0` |
| `--primary-fixed-dim` | `#ffb4a5` | `#ffb4a0` |
| `--on-primary-fixed` | `#3f0400` | `#380d00` |
| `--on-primary-fixed-variant` | `#802919` | `#7e2e12` |
| `--secondary-fixed` | `#d9e3f6` | `#ffdbd0` |
| `--secondary-fixed-dim` | `#bdc7d9` | `#e7bdb0` |
| `--on-secondary-fixed` | `#121c2a` | `#2c160d` |
| `--on-secondary-fixed-variant` | `#3d4756` | `#5d4037` |
| `--tertiary-fixed` | `#e3e2e0` | `#f6e1a6` |
| `--tertiary-fixed-dim` | `#c7c6c4` | `#d9c58d` |
| `--on-tertiary-fixed` | `#1a1c1a` | `#231b00` |
| `--on-tertiary-fixed-variant` | `#464745` | `#534619` |

**Brand accent:** Terracotta `#d66853` is the brand highlight (lighter than the
`--primary` Material role `#9d3d2c`). Where the spec calls for "terracotta text"
or "10% terracotta" (chips), use the `--primary` token.

**Nutri-Score (reserved, do NOT change):** A `#008142`, B `#85bb2f`, C `#fecb02`,
D `#ee8100`, E `#e63e11`.

---

## Typography

Dual-font: **Epilogue** (editorial headlines), **Manrope** (functional body).

**Google Fonts** (`frontend/index.html`): replace the Literata + Plus Jakarta Sans
link with:
`Epilogue:wght@600;700` and `Manrope:wght@400;500;600`.

**CSS vars** (`frontend/src/index.css`):
- `--font-heading: 'Epilogue', sans-serif;`
- `--font-body: 'Manrope', sans-serif;`

**Type scale** (`tailwind.config.js` `fontSize`). All headings use Epilogue, body/labels Manrope:

| Token | Size / Line | Weight | Tracking |
|---|---|---|---|
| `display-lg` | 72px / 80px | 700 | -0.04em |
| `display-md` | 48px / 56px | 600 | -0.02em |
| `headline-lg` | 32px / 40px | 600 | -0.02em |
| `headline-lg-mobile` | 24px / 32px | 600 | -0.01em |
| `headline-md` | 24px / 32px | 600 | -0.02em |
| `title-lg` | 20px / 28px | 600 | — |
| `body-lg` | 18px / 28px | 400 | — |
| `body-md` | 16px / 24px | 400 | — |
| `label-md` | 14px / 20px | 600 | 0.02em |
| `caption` | 12px / 16px | 500 | — |

Migration notes:
- Remove `headline-xl`, `headline-xl-mobile`, `headline-md-mobile`, `label-sm`.
  `display-lg`/`display-md` replace the XL headlines; `caption` (12px) replaces
  `label-sm` (11px).
- `fontFamily`: `heading: ['Epilogue','sans-serif']`, `body: ['Manrope','sans-serif']`.

---

## Spacing

`tailwind.config.js` `spacing` extend:

| Token | Value | Was |
|---|---|---|
| `gutter` | 32px | 24px |
| `margin-mobile` | 20px | 16px |
| `margin-desktop` | 64px | 48px |
| `stack-sm` | 16px | 12px |
| `stack-md` | 32px | 24px |
| `stack-lg` | 64px | 40px |
| `section-gap` | 128px | (new) |
| `container-max` | 1280px | (new) |

Base rhythm: 8px scale. 12-col desktop grid, 32px gutters.

---

## Elevation & Depth

Tonal stacking + backdrop blur instead of solid borders.

- **Level 0 (canvas):** `#ffffff`.
- **Level 1 (panels/cards):** ivory surface (`--surface` / `--surface-container-low`)
  with ambient shadow.
- **Level 2 (floating glass):** semi-transparent white (80%) + `20px` backdrop-blur —
  desktop navbar and modal overlays.

**Ambient shadow** (new `.ambient-shadow` utility):
`box-shadow: 0 4px 20px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.02);`
Hover lifts the card with a stronger ambient shadow (no brightness filter).

- Cards move from `rounded-lg` to `rounded-xl`.
- Desktop navbar: `bg-white/80 backdrop-blur-[20px]`, sticky. **Mobile bottom nav
  keeps a solid background** (no blur, for performance).

---

## Components

- **Buttons** — Primary: terracotta bg, white text, no shadow at rest, subtle
  `translateY(-1px)` + ambient shadow on hover. Secondary: slate bg, white text.
  Ghost/outline: 1px slate border or text-only. Min hit area 44–48px.
- **Input fields** — ivory bg (`--surface-container-low` `#fff0ee`), no border at
  rest, 1px terracotta bottom border on focus.
- **Cards** — Level 1 ivory + ambient shadow, generous padding (min 32px), `rounded-xl`.
- **Chips & tags** — small, all-caps `caption` text, 10% terracotta bg + 100%
  terracotta text, `rounded-xl`.
- **Nutrition badges** — unchanged (Nutri-Score colors isolated from theme).

---

## Shapes

`borderRadius` (unchanged from current): sm `0.25rem`, DEFAULT `0.5rem`,
md `0.75rem`, lg `1rem`, xl `1.5rem`, full `9999px`. Cards adopt `xl`.

---

## Out of Scope (per #272)

Dark mode (Obsidian Flux), the Dashboard page (new screen), new functionality
(cart, personal list).
