# Design System Strategy: The Precision Architect

This document outlines the visual and structural language for the Admin Console. As designers, your goal is to transcend the "generic dashboard" aesthetic. We are building a high-density, professional environment that feels like a precision instrument—sophisticated, authoritative, and editorial.

---

## 1. Overview & Creative North Star: "The Digital Curator"

The Creative North Star for this system is **The Digital Curator**. 

In an enterprise context, data can be chaotic. Our role is to curate that chaos into a calm, high-clarity experience. We break the "template" look by rejecting rigid borders and standard grid-lines in favor of **Tonal Architecture**. By using varying surface levels and intentional white space, we create an interface that feels like it was designed by an architect, not a framework. 

Expect a signature look defined by:

- **High-Contrast Chromaticity:** A deep, dark-themed navigation sidebar juxtaposed against a light, high-clarity content stage.
- **Asymmetric Balance:** Using large `display-lg` metrics to anchor pages, contrasted with dense, precise data tables.
- **Editorial Typography:** Treating data as content that deserves a hierarchy as thoughtful as a premium magazine.

---

## 2. Colors & Surface Philosophy

Our palette isn't just "blue and gray." It is a system of atmospheric depth.

### The Color Tokens

- **Primary (`#2D3250`):** A professional slate-indigo. Use this for moments of authority.
- **Surface Tiers:** Use `surface_container_lowest` (#ffffff) for active cards and `surface_container` (#eeeeee) for secondary sections.
- **Status Accents:** Use `error` (#ba1a1a) sparingly. Success and Pending states should use clear green and amber, but keep them muted to maintain the sophisticated tone.

### The "No-Line" Rule

**Explicit Instruction:** Do not use 1px solid borders to separate sections. We define boundaries through background color shifts. 

- *Example:* Place a `surface_container_lowest` card on a `surface_container_low` background. The shift in hex code provides all the separation the eye needs.

### The "Glass & Gradient" Rule

To elevate the "Admin" feel, floating elements (Modals, Popovers) must use **Glassmorphism**.

- **Tokens:** Use semi-transparent `surface` colors with a `backdrop-blur: 12px`.
- **CTAs:** Primary buttons should use a subtle linear gradient from `primary` (#2D3250) to `primary_container` (#545879) at a 135° angle to add "visual soul" and depth.

---

## 3. Typography: The Editorial Edge

We use a dual-font strategy to balance character with utility.

- **Display & Headlines (Manrope):** Chosen for its geometric precision. Use `display-lg` (3.5rem) for high-level dashboard metrics to give them an authoritative, "hero" presence.
- **Body & Labels (Inter):** The workhorse. Inter is used for all data tables, inputs, and descriptions. Its tall x-height ensures readability at the dense `body-sm` (0.75rem) level.

**Hierarchy Tip:** Always pair a `label-md` (uppercase, tracked out +5%) with a `title-lg` value for section headers. This creates a "Pro-Label" look found in high-end financial terminals.

---

## 4. Elevation & Depth: Tonal Layering

Shadows are a last resort. Depth is achieved through "stacking" the surface-container tiers.

1. **The Layering Principle:**
  - **Base:** `surface` (#f9f9f9)
  - **Sectioning:** `surface_container_low` (#f3f3f3)
  - **Actionable Cards:** `surface_container_lowest` (#ffffff)
2. **Ambient Shadows:** If an element must float (e.g., a dropdown), use a shadow with a blur of `16px` and an opacity of `4-6%`. Use the `on_surface` color for the shadow tint—never pure black.
3. **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline_variant` (#c5c5d4) at **15% opacity**. It should be felt, not seen.

---

## 5. Components & FSD Implementation

Following the **Feature-Sliced Design (FSD)** approach, components should be treated as "atoms" within the `shared` layer, while "molecules" like data rows live within `entities`.

### Buttons

- **Primary:** Gradient-filled (Primary to Primary-Container), `roundness-md` (0.375rem).
- **Tertiary/Ghost:** No container. Use `on_surface_variant` with a transition to `primary` on hover.

### Input Fields

- **Style:** No bottom line or heavy border. Use a subtle `surface_container_high` background.
- **States:** On focus, transition the background to `surface_container_lowest` and add a "Ghost Border" of `primary`.

### Cards & Data Lists

- **Forbid Dividers:** Do not use `<hr>` or border-bottoms. Use `spacing-4` (0.9rem) of vertical white space or a subtle toggle between `surface` and `surface_container_low` for zebra-striping.
- **Density:** Use `spacing-2.5` (0.5rem) for internal cell padding to maintain high information density without clutter.

### Signature Component: The Metric Block

- A combination of `display-sm` for the value, `label-sm` for the category, and a micro-sparkline using the `secondary` color. This component is the "hero" of the Admin Console.

---

## 6. Do's and Don'ts

### Do

- **Do** use asymmetrical layouts. A sidebar that is significantly darker than the content area creates a "Control Room" feel.
- **Do** lean into `spacing-10` and `spacing-12` for page margins. Luxury is defined by the space you *don't* use.
- **Do** use `inter` for all numbers. Manrope is for words; Inter's tabular-nums feature is for data.

### Don't

- **Don't** use pure black (#000000) for text. Use `on_surface` (#1a1c1c) to keep the contrast sophisticated.
- **Don't** use standard "Material Design" shadows. They feel like templates. Stick to Tonal Layering.
- **Don't** use rounded corners larger than `xl` (0.75rem). We want the UI to feel "precise," not "bubbly." Keep most containers at `md` (0.375rem).

---

## 7. FSD Layering Reminder

- **Shared:** Primitive UI (Buttons, Inputs, Spacing Tokens).
- **Entities:** Domain-specific units (UserCard, TransactionRow).
- **Features:** User interactions (SearchUser, ExportCSV).
- **Widgets:** Complex compositions (Sidebar, Header, MainDashboardGrid).

