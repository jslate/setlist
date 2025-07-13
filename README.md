# Setlist

Static site for managing and displaying song chord charts.

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

Add your song files in ChordPro format under the `chordpro/` directory. File names should match the `slug` values (e.g. `chordpro/cant-sleep.cho`).

### Generate PDF charts

```bash
npm run gen:pdf
```

### Generate HTML charts

```bash
npm run gen:html
```

### Generate combined setlist PDF

```bash
npm run gen:setlist
```

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