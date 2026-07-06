# DealFlow

**Investment intelligence for venture capital.**

Screen hundreds of startups in a single pass and surface the few most likely to
become exceptional investments — with a transparent rationale behind every score.

## The experience

DealFlow is intentionally sequenced. Nothing is scored until an analyst chooses a
source of data:

```
Landing → Choose a data source → Upload CSV/Excel or use the demo cohort
        → AI processing → Portfolio overview → Ranked companies → Company memo
```

There is no auto-loaded demo dashboard. The analyst decides what to screen.

### Landing
A premium, institutional landing page that communicates quality, speed and
confidence — with a live product preview, a clear "how it works", key
capabilities, and the reasons investors can trust the output.

### Portfolio overview
Answers one question first — *what deserves my attention?* — through a deliberate
hierarchy: global metrics, then AI insights, then the highest-potential companies,
then the full ranked dataset.

### Company memo
Every company opens as an investment memo: thesis, overall score, why the model
ranked it that way, founder assessment, market opportunity, traction, financial
signals, competitive position, strengths, risks, supporting evidence, similar
companies, and recommended next steps.

## Scoring

Each company is scored across four weighted pillars — **Team & Founder (25)**,
**Traction & Financials (30)**, **Market & Growth (30)** and **Macro & Deal Fit
(15)**. Market growth is not self-reported: a log-linear OLS regression on each
sector's historical TAM sets the ceiling every company is measured against, with a
95% confidence band and a fit quality (R²). A data-confidence rating reflects how
complete each submission was.

## Data in, ranking out

Import a CSV or Excel export (one row per company), enter a single company through
a guided form, or drop in a pitch deck / financial model — PDFs are parsed with
pdf.js and spreadsheets with SheetJS, entirely in the browser. Nothing is uploaded
to a server.

## Design system

A single token system (`src/app/globals.css`) drives typography, spacing, color,
elevation, radii and motion across a light workspace and a dark marketing surface.
Shared primitives live in `src/components/app/primitives.tsx`; screens are composed
from them so the whole product reads as one system.

## Tech

- **Framework**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4 (CSS-variable tokens), shadcn/ui primitives
- **Charts**: hand-built SVG (score rings, sparklines, market regression)
- **Parsing**: pdf.js, SheetJS — browser-side, no backend

## Run

```bash
npm install
npm run dev
```
