# Style guide — Sân Mây (C1)

## Direction

A quiet, welcoming Vietnamese temple courtyard: warm paper and timber, muted roof terracotta, restrained leaf greens, aged brass accents, and deep teal shadows. Preserve map-specific color identity and readability. Use ornament as emphasis, not noise. UI should feel crafted and calm while keeping existing controls and interaction behavior intact.

## Shared CSS tokens

Defined in `public/css/tokens.css`, loaded before `main.css`:

- **Materials:** `--color-paper`, `--color-wood`, `--color-roof`, `--color-leaf`, `--color-gold`, `--color-night`, `--color-surface`, `--color-panel-glass`, `--color-ink`.
- **Text/support:** `--color-muted`, `--color-accent`, `--color-border`.
- **Rhythm:** `--space-1` through `--space-6` (4–32px).
- **Shape/elevation:** `--radius-small`, `--radius-control`, `--radius-card`, `--radius-panel`, `--shadow-panel`, `--blur-panel`.
- **Motion/layers:** `--motion-fast`, `--motion-panel`, and `--layer-*`.
- Existing names (`--bg`, `--surface`, `--gold`, `--wood`, `--text`, `--accent`, `--muted`, `--glass`, `--line`) remain as aliases for incremental adoption.

## Use

```css
.example-panel {
  color: var(--color-paper);
  background: var(--color-panel-glass);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  padding: var(--space-4);
  box-shadow: var(--shadow-panel);
}
```

Prefer shared tokens over new near-duplicate values. Keep body copy legible against translucent surfaces. Controls should have clear focus/pressed states and retain touch-friendly dimensions. Keep animations short and purposeful; honor the existing reduced-motion setting. Keep world draw order, collision coordinates, gameplay actions and input semantics independent of visual polish.

## Review status

Token/style foundation is implemented. `assets/style-board.svg` is a schematic reference for the palette and panel treatment, not a capture of the running game. A real before/after screenshot and viewport review are still required before C1 can be marked fully accepted.
