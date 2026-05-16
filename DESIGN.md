---
name: Terracotta Dark
colors:
  surface: "#111318"
  surface-dim: "#111318"
  surface-bright: "#37393e"
  surface-container-lowest: "#0c0e13"
  surface-container-low: "#191c20"
  surface-container: "#1d2024"
  surface-container-high: "#282a2f"
  surface-container-highest: "#33353a"
  on-surface: "#e2e2e8"
  on-surface-variant: "#ddc0bb"
  inverse-surface: "#e2e2e8"
  inverse-on-surface: "#2e3035"
  outline: "#a48b86"
  outline-variant: "#56423e"
  surface-tint: "#ffb4a5"
  primary: "#ffb4a5"
  on-primary: "#611205"
  primary-container: "#e0705a"
  on-primary-container: "#580a01"
  inverse-primary: "#a03f2e"
  secondary: "#c6c6cb"
  on-secondary: "#2e3034"
  secondary-container: "#47494d"
  on-secondary-container: "#b7b8bd"
  tertiary: "#64dac0"
  on-tertiary: "#00382e"
  tertiary-container: "#1ba38b"
  on-tertiary-container: "#003028"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  primary-fixed: "#ffdad3"
  primary-fixed-dim: "#ffb4a5"
  on-primary-fixed: "#3f0400"
  on-primary-fixed-variant: "#802919"
  secondary-fixed: "#e2e2e7"
  secondary-fixed-dim: "#c6c6cb"
  on-secondary-fixed: "#1a1c1f"
  on-secondary-fixed-variant: "#45474b"
  tertiary-fixed: "#82f7dc"
  tertiary-fixed-dim: "#64dac0"
  on-tertiary-fixed: "#00201a"
  on-tertiary-fixed-variant: "#005144"
  background: "#111318"
  on-background: "#e2e2e8"
  surface-variant: "#33353a"
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: "800"
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: "700"
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: "700"
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: "700"
    lineHeight: 14px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: "800"
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  nav-rail-width: 72px
  sidebar-width: 240px
---

## Brand & Style

This design system is built for high-density community engagement and real-time communication. It captures the social, "always-on" energy of modern chat platforms while pivoting away from standard tech-blue palettes in favor of a warm, grounded terracotta.

The aesthetic follows a **Corporate-Modern** framework with heavy **Minimalist** influences. It relies on deep tonal layering rather than traditional shadows to create hierarchy. The experience should feel immersive, focused, and hospitable—balancing the efficiency of a tool with the comfort of a digital "third place."

**Key Principles:**

- **Immersive Depth:** Use tonal shifts in the dark spectrum to define workspaces without introducing visual noise.
- **Focused Energy:** Reserve the terracotta accent for high-value interactions and notification states.
- **Human Geometry:** Combine structured layouts with soft, generous corner radii to maintain an approachable feel.

## Colors

The palette is anchored in a three-tier grayscale system designed for maximum legibility in low-light environments.

1.  **Background (#313338):** The primary canvas for content areas.
2.  **Surface (#2b2d31):** Used for sidebar navigation, cards, and nested containers.
3.  **Surface Alt (#1e1f22):** Reserved for the furthest background layers, such as the icon navigation rail.

The **Terracotta (#d66853)** acts as the primary signal color. It must be used sparingly to prevent visual fatigue, appearing primarily in buttons, active states, and unread indicators. Success, Warning, and Error colors are vibrant and saturated to ensure they pop against the charcoal base.

## Typography

This design system utilizes **Plus Jakarta Sans** across all levels to maintain a friendly, contemporary character.

- **Headlines:** Use Bold (700) or ExtraBold (800) with slight negative letter-spacing to create a "tight" editorial feel.
- **Body:** Regular (400) is the standard for long-form text and chat messages to ensure maximum readability.
- **Labels:** Use SemiBold (600) or Bold (700) with uppercase styling for category headers and utility text. This provides clear visual separation from content-heavy body text.

## Layout & Spacing

The layout follows a **Multi-Pane Fixed Sidebar** model.

1.  **Level 1: The Rail (72px):** A slim, dark vertical bar on the far left for primary icons.
2.  **Level 2: The Sidebar (240px):** A secondary navigation pane for nested lists, channels, or folders.
3.  **Level 3: Content Area:** A fluid container for the main application logic.

We utilize a **4px base grid**. Components should generally use `16px (md)` padding for internal containers and `8px (sm)` for smaller list items. On mobile, the Rail and Sidebar transition into a slide-out drawer, while the Content Area takes full width.

## Elevation & Depth

Depth is established through **Tonal Layering** rather than shadows. Surfaces closer to the user are rendered in lighter shades of gray.

- **Level 0 (Deepest):** Nav Rail (#1e1f22).
- **Level 1:** Content Background (#313338).
- **Level 2:** Sidebar and Hover states (#2b2d31).
- **Level 3 (Highest):** Tooltips and Modals (#111214) with a very subtle 1px border (#3f4147).

Active states for buttons or list items should use the Terracotta color or a subtle 2px vertical "pill" indicator on the left edge of the element.

## Shapes

The design system uses a **Rounded** language to soften the industrial feel of the dark mode palette.

- **Standard Elements:** Buttons, input fields, and small cards use a `0.5rem (8px)` radius.
- **Large Containers:** Modals and main content cards use `1rem (16px)` or `rounded-lg`.
- **Special States:** The "active" state for icons in the nav rail should transition from a circle to a `rounded-xl` square on hover or selection, mimicking a responsive, organic feel.

## Components

### Buttons

- **Primary:** Terracotta background with white text. High-contrast, 8px corner radius.
- **Secondary:** Surface gray (#2b2d31) with off-white text.
- **Interactivity:** On hover, increase brightness by 10%. On active/press, scale down slightly (98%).

### Input Fields

- Darkest gray background (#1e1f22) with no border.
- On focus, add a subtle terracotta outline or a 2px bottom border.
- Placeholder text uses the Muted Gray (#949ba4).

### Cards & Lists

- **Cards:** No border; use Surface (#2b2d31) color.
- **Lists:** Use 4px vertical spacing between items. Hover states should apply a background color of #35373c and change text from Muted to Off-white.

### Chips & Badges

- **Notification Badges:** Circular, Terracotta background, Bold white text, positioned at the top-right corner of icons.
- **Status Chips:** Use a "dot" indicator next to labels (e.g., Green for success).

### Navigation Rail Icons

- Size: 48x48px containers.
- Default: Circular.
- Active/Hover: Transition to `rounded-xl` with a Terracotta background.
