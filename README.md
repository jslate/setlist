# Setlist

Static site for managing and displaying song chord charts.

## Tailwind CSS

Tailwind CSS is configured via the `src/style.css` directives and the `tailwind.config.js` at the project root. The config specifies scanning of `index.html`, all generated HTML pages under `html/`, and JS/TS files under `src/` so that JIT utilities are available in both dev and production builds.

## Prerequisites

- Node.js (for Vite and Tailwind CSS)
- `chordpro` command-line tool (for generating PDF and HTML chord sheets)
- `pdfunite` (from Poppler) (required for merging the setlist PDF)

## Data

Place song metadata in `src/data/songs.json`. Each entry should include:

```json
[
  {
    "slug": "cant-sleep",
    "title": "I'm Tired (But I Just Can't Sleep)",
    "instrumentation": "Full band",
    "audio": "/audio/2025-07-06-tired.m4a",
    "notes": "Medium tempo, can be played with just a duo"
  }
]
```

## ChordPro files

Add your song files in ChordPro format under the `src/chordpro/` directory. File names should match the `slug` values (e.g. `src/chordpro/cant-sleep.cho`).
Pre-rendered PDFs (indicated by `"prerendered": true` in `songs.json`) should be placed in `src/pdf/` (e.g. `src/pdf/be-kind.pdf`).

### Generate PDF charts

```bash
npm run gen:pdf
```

This will generate individual song PDFs to the top-level `pdf/` directory and copy any pre-rendered PDFs from `src/pdf/`.

### Generate HTML charts

```bash
npm run gen:html
```

> This command now also injects Tailwind styling for `.title` and `.verse` elements in the generated HTML.

### Generate combined setlist PDF

```bash
npm run gen:setlist
```

The setlist PDF will also be output to the top-level `pdf/` directory.

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open your browser at `http://localhost:3000` to view the index page.

## Production build

```bash
npm run build
```