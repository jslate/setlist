#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { copyIfChanged, needsRebuild, markBuilt, songPdfDeps } = require('./generator-utils.cjs');
const { buildSongPdf, TRANSPOSE } = require('./buildSongPdf.cjs');

const chordDir = path.resolve(__dirname, '../src/chordpro');
const pdfDir   = path.resolve(__dirname, '../pdf');
const dataPath = path.resolve(__dirname, '../src/data/songs.json');
const cacheFile = path.resolve(__dirname, '../.build-cache.json');

const VARIANTS = [
  { name: 'concert', dir: '', transpose: TRANSPOSE.concert, requiresTag: null },
  { name: 'bb',      dir: 'bb', transpose: TRANSPOSE.bb,    requiresTag: 'transpose' },
  { name: 'eb',      dir: 'eb', transpose: TRANSPOSE.eb,    requiresTag: 'transpose' },
];

async function main() {
  fs.mkdirSync(pdfDir, { recursive: true });

  const srcPdfDir = path.resolve(__dirname, '../src/pdf');
  if (fs.existsSync(srcPdfDir)) {
    fs.readdirSync(srcPdfDir)
      .filter(file => file.endsWith('.pdf'))
      .forEach(file => {
        copyIfChanged(path.join(srcPdfDir, file), path.join(pdfDir, file));
      });
  }

  let songs = [];
  try {
    songs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (err) {
    console.error('Could not read songs.json:', err.message);
    process.exit(1);
  }

  const files = fs.readdirSync(chordDir).filter(file => file.endsWith('.cho'));
  for (const file of files) {
    const slug = path.basename(file, '.cho');
    const song = songs.find(s => s.slug === slug);
    const tags = (song && Array.isArray(song.tags)) ? song.tags : [];

    for (const v of VARIANTS) {
      if (v.requiresTag && !tags.includes(v.requiresTag)) continue;

      const outPath = path.join(pdfDir, v.dir, `${slug}.pdf`);
      const deps = [
        ...songPdfDeps({ slug, chordDir, dataPath }),
        { label: 'transpose', value: String(v.transpose) },
      ];

      if (!needsRebuild(outPath, cacheFile, deps)) continue;

      try {
        const built = await buildSongPdf({ slug, songs, outPath, transpose: v.transpose });
        if (!built) continue;
        markBuilt(cacheFile, outPath, deps);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    }
  }

  console.log('Generated PDFs (with notes and reference tracks) in pdf/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
