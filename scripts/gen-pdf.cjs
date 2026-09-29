#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getAnnotatedChordProContent } = require('./prependNotes.cjs');
const { copyIfChanged, needsRebuild, markBuilt, songPdfDeps } = require('./generator-utils.cjs');
const { preprocessAbc } = require('./renderAbc.cjs');

// Directories and metadata
const chordDir = path.resolve(__dirname, '../src/chordpro');
const pdfDir   = path.resolve(__dirname, '../pdf');
const dataPath = path.resolve(__dirname, '../src/data/songs.json');
const abcRenderedDir = path.resolve(__dirname, '../src/abc-rendered');
const cacheFile = path.resolve(__dirname, '../.build-cache.json');

async function main() {
  fs.mkdirSync(pdfDir, { recursive: true });

  // Copy pre-rendered PDFs from src/pdf to pdf directory
  const srcPdfDir = path.resolve(__dirname, '../src/pdf');
  if (fs.existsSync(srcPdfDir)) {
    fs.readdirSync(srcPdfDir)
      .filter(file => file.endsWith('.pdf'))
      .forEach(file => {
        copyIfChanged(path.join(srcPdfDir, file), path.join(pdfDir, file));
      });
  }

  // Load song metadata
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
    const outPath = path.join(pdfDir, `${slug}.pdf`);
    const deps = songPdfDeps({ slug, chordDir, dataPath });

    if (!needsRebuild(outPath, cacheFile, deps)) {
      continue;
    }

    let tempContent = getAnnotatedChordProContent(slug, chordDir, songs);
    if (!tempContent) continue;

    ({ content: tempContent } = await preprocessAbc(tempContent, { slug, renderedDir: abcRenderedDir }));

    const tempPath = path.join(chordDir, `${slug}.tmp.cho`);
    fs.writeFileSync(tempPath, tempContent, 'utf8');

    const res = spawnSync('chordpro', [tempPath, '-G', '-o', outPath], {
      stdio: 'inherit',
    });
    fs.unlinkSync(tempPath);
    if (res.error || res.status !== 0) {
      console.error(`Error generating PDF for ${file}`);
      process.exit(1);
    }

    markBuilt(cacheFile, outPath, deps);
  }

  console.log('Generated PDFs (with notes and reference tracks) in pdf/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
