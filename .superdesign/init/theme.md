# Current theme

White background oklch(1 0 0), foreground oklch(0.145 0 0), muted foreground oklch(0.45 0 0). Font Arial/Helvetica/sans-serif. Tailwind 4 defaults; no bespoke spacing, radius, shadows, breakpoints, or dark theme. Proposed tracker design is specified separately in .superdesign/design-system.md.

## src/app/globals.css

```css
@import "tailwindcss";

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --muted-foreground: oklch(0.45 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted-foreground: var(--muted-foreground);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```
