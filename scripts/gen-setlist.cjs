#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Read song metadata
const dataPath = path.resolve(__dirname, '../src/data/songs.json');
const pdfDir = path.resolve(__dirname, '../public/pdf');

let songs;
try {
  songs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (err) {
  console.error('Error reading songs.json:', err.message);
  process.exit(1);
}

// Filter out holding-bin entries and map to PDF paths in JSON order
const pdfFiles = songs
  .filter(song => !song.holding)
  .map(song => path.join(pdfDir, `${song.slug}.pdf`))
  .filter(fs.existsSync);

if (!pdfFiles.length) {
  console.error('No PDFs found to combine into setlist.');
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

// Output file
const outputFile = path.join(pdfDir, 'setlist.pdf');

// Spawn pdfunite
const result = spawnSync('pdfunite', [...pdfFiles, outputFile], { stdio: 'inherit' });
if (result.error) {
  console.error('Error running pdfunite:', result.error.message);
  process.exit(1);
}

console.log(`Wrote setlist PDF to ${outputFile}`);