#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getAnnotatedChordProContent } = require('./prependNotes.cjs');

// Paths
const chordDir = path.resolve(__dirname, '../src/chordpro');
const pdfDir = path.resolve(__dirname, '../pdf');
const dataPath = path.resolve(__dirname, '../src/data/songs.json');

// Flags
const fullBand = process.argv.includes('--fullband');

// Read metadata
let songs = [];
try {
  songs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (err) {
  console.error('Error reading songs.json:', err.message);
  process.exit(1);
}

// Filter and prepare
const filteredSongs = songs
  .filter(song => !song.holding)
  .filter(song => !fullBand || song.instrumentation === 'Full band');

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

const songPDFs = [];
const pageNumbers = []; // keep track of where each song starts

let currentPage = 2; // TOC will be page 1

filteredSongs.forEach((song) => {
  const pdfPath = path.join(pdfDir, `${song.slug}.pdf`);
  const title = song.title;

  if (song.prerendered) {
    if (!fs.existsSync(pdfPath)) {
      console.warn(`Missing pre-rendered PDF: ${pdfPath}`);
      return;
    }
  } else {
    const content = getAnnotatedChordProContent(song.slug, chordDir, songs);
    if (!content || content.trim() === '') {
      console.warn(`No content for ${song.slug}, skipping PDF generation`);
      return;
    }

    const tempChoPath = path.join(chordDir, `${song.slug}.tmp.cho`);
    fs.writeFileSync(tempChoPath, content, 'utf8');

    const result = spawnSync('chordpro', [tempChoPath, '-G', '-o', pdfPath], { stdio: 'inherit' });
    fs.unlinkSync(tempChoPath);
    if (result.error || result.status !== 0) {
      console.error(`Error generating PDF for ${song.slug}`);
      process.exit(1);
    }
  }

  // Get page count
  const info = spawnSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  const match = info.stdout.match(/Pages:\s+(\d+)/);
  const pages = match ? parseInt(match[1], 10) : 1;

  pageNumbers.push({ title, page: currentPage });
  currentPage += pages;
  songPDFs.push(pdfPath);
});

// Generate TOC
const tocLines = pageNumbers.map((entry, i) => {
  return `{comment: ${i + 1}. ${entry.title} ......... ${entry.page}}`;
});
const tocCho = `{title: Setlist Table of Contents}\n` + tocLines.join('\n') + '\n';

const tocChoPath = path.join(chordDir, '__toc__.tmp.cho');
const tocPdfPath = path.join(pdfDir, '__toc__.pdf');
fs.writeFileSync(tocChoPath, tocCho, 'utf8');

const tocRes = spawnSync('chordpro', [tocChoPath, '-o', tocPdfPath], { stdio: 'inherit' });
fs.unlinkSync(tocChoPath);
if (tocRes.error || tocRes.status !== 0) {
  console.error('Failed to generate TOC PDF');
  process.exit(1);
}

// Merge all PDFs
const finalOutput = path.join(
  pdfDir,
  fullBand ? 'setlist-fullband.pdf' : 'setlist.pdf'
);

const allPdfs = [tocPdfPath, ...songPDFs];
const unite = spawnSync('pdfunite', [...allPdfs, finalOutput], { stdio: 'inherit' });
if (unite.error || unite.status !== 0) {
  console.error('Failed to merge PDFs');
  process.exit(1);
}

console.log(`✅ Wrote setlist PDF to ${finalOutput}`);
