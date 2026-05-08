---
name: Collective Commerce System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#b90538'
  on-secondary: '#ffffff'
  secondary-container: '#dc2c4f'
  on-secondary-container: '#fffbff'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cea700'
  on-tertiary-container: '#4e3e00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#ffdadb'
  secondary-fixed-dim: '#ffb2b7'
  on-secondary-fixed: '#40000d'
  on-secondary-fixed-variant: '#92002a'
  tertiary-fixed: '#ffe083'
  tertiary-fixed-dim: '#eec200'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-base:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin: 24px
---

## Brand & Style

The design system is anchored in the concepts of **collective empowerment** and **shared value**. The brand personality is designed to feel like a reliable neighbor: helpful, transparent, and encouraging. It balances the high-trust requirements of a financial transaction platform with the vibrant, energetic feel of a community marketplace.

We utilize a **Modern-Approachable** style. This avoids the coldness of traditional fintech by incorporating soft depth and organic shapes while maintaining a clean, minimalist structure that ensures the product remains the hero. The interface should evoke a sense of momentum—showing that users are part of something moving forward together.

## Colors

The palette for the design system is led by a **Deep Teal** primary, chosen for its psychological associations with clarity and stability. This is supported by a **Coral** secondary color used strictly for "Join" or "Buy" actions to create a sense of warmth and urgency without the alarmist nature of pure red.

- **Primary (Teal):** Used for navigation, primary branding, and "in-progress" states.
- **Secondary (Coral):** Reserved for high-conversion CTAs and active participation buttons.
- **Tertiary (Sunny Yellow):** Used sparingly for highlighting "Hot Deals" or limited-time milestones.
- **Neutrals:** A range of Slate grays with a subtle blue undertone to maintain harmony with the primary teal.
- **Semantic Colors:** Success (Emerald), Warning (Amber), and Error (Rose) are used for transaction statuses.

## Typography

The design system utilizes **Plus Jakarta Sans** for all levels of the hierarchy. Its soft terminals and modern geometric construction make it exceptionally readable at small sizes (item specs) while remaining friendly and optimistic at large sizes (marketing headlines).

- **Headlines:** Use Bold or Extra-Bold weights with slightly tightened letter-spacing to create a "strong together" visual impact.
- **Body Text:** Standardized on a 1.6 line-height to ensure maximum readability during long browsing sessions.
- **Labels:** Uppercase styling is used for status badges and metadata to provide a clear contrast against body copy.

## Layout & Spacing

The design system employs a **12-column fluid grid** for desktop and a **4-column grid** for mobile. We follow an 8pt spatial rhythm (with a 4pt half-step for micro-adjustments). 

Layouts should prioritize "Community Social Proof" by allowing space for "User Avatars" and "Recent Activity" feeds alongside product information. Margins are generous to prevent the UI from feeling cluttered, reinforcing a sense of premium quality and ease of use.

## Elevation & Depth

Depth in the design system is communicated through **Ambient Shadows** rather than harsh borders. This creates a "Tactile" feel where elements appear to float softly above the canvas.

- **Level 0 (Flat):** Used for the main background and inactive input states.
- **Level 1 (Soft):** Used for product cards and secondary containers. Shadows use a 10% opacity of the primary teal color to keep the shadows "warm" and integrated.
- **Level 2 (Lifted):** Used for hover states and active modals. 
- **Tonal Layering:** We use subtle background tints (e.g., 2% primary color) to differentiate sections of a page without adding visual weight.

## Shapes

The shape language is consistently **Rounded**. The 0.5rem (8px) base radius ensures that UI elements feel safe and approachable. 

- **Cards & Modals:** Use `rounded-lg` (16px) or `rounded-xl` (24px) to create a soft, friendly frame for product images.
- **Progress Bars:** These must always use a fully pill-shaped (rounded-full) container to emphasize the fluid, "filling up" nature of group buying progress.
- **Interactive Elements:** Buttons follow the `rounded-lg` standard to provide a large, inviting hit area.

## Components

### Progress Bars
The core of the design system. Progress bars use a two-tone Teal (Track: 10% Teal, Fill: 100% Teal). For groups nearing completion (>90%), the fill color may pulse slightly or transition to the Sunny Yellow accent to encourage the final push.

### Status Badges
Badges are used for "Group Active," "Target Reached," and "Shipped." They use a "Low-Contrast" style: a light tinted background with a high-contrast text label (e.g., Light Teal background with Deep Teal text).

### Buttons
- **Primary:** Teal background, White text. High-contrast.
- **Join/Action:** Coral background. This is specifically for the "Join Group" action to distinguish it from navigation.
- **Secondary:** Transparent background with a Teal 1px border.

### Product Cards
Cards feature a large image area, a prominent "Group Progress" indicator, and a "Social Proof" stack showing the avatars of current participants. The cards use a soft shadow (Level 1) to distinguish them from the background.

### Input Fields
Inputs are clean with a 1px Slate border that transitions to a 2px Teal border on focus. Labels are always visible above the field for accessibility.