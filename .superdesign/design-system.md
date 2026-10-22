# Habit Tracker — mobile-first product design

## Product

A private self-hosted habit tracker with multiple addable habits. English UI. Next.js, React, Tailwind, SQLite and Recharts. No marketing page, account widgets, teams, billing, social features, or spiritual prompts. No supplied logo or imagery. Use the product name as a wordmark, not an invented logo.

## Primary flows

Today: choose a local calendar date, review habits, log counts or completion, edit or clear records. Add habit: name, count/completion type, increase/decrease direction, daily target, daily/hourly tracking, waking hours, review time. Habits can be edited or archived. Show helpful distinctions between 'Not reviewed', a reviewed zero, and logged occurrences. Hourly tracking should open a separate focused detail panel, with before/from review-time totals and hours reviewed. Notes: what helped or made it difficult. Progress: per-habit daily/weekly plots with recording coverage and missing-data gaps. Import: user-selected Excel workbook, preview and explicit confirmation; no automatic data uploads. Show export as a local JSON backup option if space permits. Empty state must invite the first habit, not silently fabricate records.

## Visual direction

Quiet, precise, friendly utility. Warm white canvas #F7F8F5, white cards #FFFFFF, dark ink #192B25, secondary text #54645C, thin borders #DCE3DC. Accent forest #28654B, pale accent #EAF3EC. Amber #8A5B18 with pale #FCF3E2 for attention states; errors #B42318. No gradients, decoration, stock imagery, or emoji. Arial/Helvetica/system sans serif, matching the starter's no-network font choice. Headings 28/32px desktop, 26/30px mobile; body 16px; labels 13–14px. Cards 16px radius, inputs 10px radius, buttons 12px radius. Spacing multiples of 4: 4/8/12/16/20/24/32. Restrained shadow 0 2px 12px rgba(25,43,37,.04). Clear focus outline. Small Lucide-style line icons, never icon-only unlabeled actions.

## Responsive constraints

The priority viewport is iPhone 13 mini: 375×812 CSS pixels, portrait. Also support 320px width, landscape, tablet, and desktop. 16px side gutters mobile; 1200px max content desktop. No horizontal document scrolling. One-column cards on small screens; two-column layout for dashboard and progress at 900px. Primary touch targets at least 44×44px. Form input text at least 16px to avoid iOS zoom. A mobile bottom navigation with Today, Progress, Manage; safe-area-inset-bottom padding; sufficient content padding so it never covers the last item. Desktop nav can be top-aligned. Modals become full-width scrollable sheets on mobile, max-height based on 100dvh. Keep save controls reachable with keyboard open. Use native date/number inputs with visible labels. Respect reduced motion. Do not disable pinch zoom.

## Data semantics

Demo records are fictional and must be labeled sample data. Never show perfect streaks based on unrecorded days. Blank != zero: blank is not reviewed; zero is reviewed with no occurrences. Coverage accompanies every progress total; missing days are chart gaps, never connected as zero. Hourly partial days must be marked partial, not target met. Completion status for decrease habits is not the same as increase habits.

## Draft scope

Create one responsive Today/dashboard draft with a small per-habit progress preview, an hourly-review affordance, a visible add-habit affordance and useful navigation. Include working local prototype interactions for navigation, add-habit sheet, and logging if possible, but label it a sample preview. No actual API calls. This is a design review before app implementation.
