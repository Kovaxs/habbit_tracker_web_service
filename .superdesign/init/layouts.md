# Root layout

`src/app/layout.tsx` renders the English document and children. No navigation or shared shell exists yet.

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Habit Tracker",
  description: "Personal habit tracking, records, and progress.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```
