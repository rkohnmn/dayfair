# Dayfair visual system

**Reference:** An editorial household account book meeting a modern utility dashboard. Quiet paper, solid ink, tabular monetary figures and a distinctive striped, three-member graphic. It is deliberately not a generic SaaS gradient/card grid.

- **Palette:** paper `#f5f2e9`, white `#fffef9`, forest `#193c34`, olive `#d9efa4`, terracotta `#e8895f`. The results panel turns into a dense dark green ledger; the editor is a light writable sheet. Semantic errors are text-first with a red-brown background, not color alone.
- **Type:** system UI sans for crisp interface operations; Georgia italic serif as a sparse editorial accent. No webfonts or CDN requests.
- **Hierarchy:** hero at the top, immediately followed by a working editor. The editor uses numbered divisions and supports multiple rows; results stay sticky on wide screens, then flow below on mobile.
- **Shapes and spacing:** 5–9px form/panel radii; circular numbered steps; deliberate 8–24px spacings. Borders are more important than shadows. No gratuitous animation.
- **Charts:** daily presence strip has a bar per inclusive billing day. Bar colors represent how many people were present; hovering exposes the date and names. Per-bill member shares use length on a common baseline; precise currency is printed alongside each bar. Graphical marks are supplementary, not the sole quantitative evidence.
- **Interaction:** instant calculation on change, concise recoverable validation errors, keyboard-visible focus outlines, print-only statement, state feedback, no modal onboarding and a working example at first load.
- **Themes:** a deliberate alternate dark palette; result panel keeps a deep contrast surface in both modes. Respect `prefers-reduced-motion` and user device color scheme where possible; the app defaults to light and lets users switch.

### Accessibility audit priorities

Keyboard focus and labels, error messages with words, balanced color and text, no horizontal overflow, touch-friendly controls, and semantic tables. Testing with a real screen reader remains outstanding; see `docs/QA.md`.
