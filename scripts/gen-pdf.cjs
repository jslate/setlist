#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getAnnotatedChordProContent } = require('./prependNotes.cjs');

// Directories and metadata
const chordDir = path.resolve(__dirname, '../src/chordpro');
const pdfDir   = path.resolve(__dirname, '../pdf');
const dataPath = path.resolve(__dirname, '../src/data/songs.json');

// Ensure output directory exists
fs.mkdirSync(pdfDir, { recursive: true });

// Copy pre-rendered PDFs from src/pdf to pdf directory
const srcPdfDir = path.resolve(__dirname, '../src/pdf');
if (fs.existsSync(srcPdfDir)) {
  fs.readdirSync(srcPdfDir)
    .filter(file => file.endsWith('.pdf'))
    .forEach(file => {
      fs.copyFileSync(path.join(srcPdfDir, file), path.join(pdfDir, file));
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

// Process each ChordPro file
fs.readdirSync(chordDir)
  .filter(file => file.endsWith('.cho'))
  .forEach(file => {
    const slug = path.basename(file, '.cho');
    const tempContent = getAnnotatedChordProContent(slug, chordDir, songs);
    if (!tempContent) return;

    // Write to temporary file
    const tempPath = path.join(chordDir, `${slug}.tmp.cho`);
    fs.writeFileSync(tempPath, tempContent, 'utf8');

    // Generate PDF via chordpro CLI
    const outPath = path.join(pdfDir, `${slug}.pdf`);
    const res = spawnSync('chordpro', [tempPath, '-G', '-o', outPath], {
      stdio: 'inherit',
    });
    fs.unlinkSync(tempPath);
    if (res.error || res.status !== 0) {
      console.error(`Error generating PDF for ${file}`);
      process.exit(1);
    }
  });

console.log('Generated PDFs (with notes and reference tracks) in pdf/');
