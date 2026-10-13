#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { copyIfChanged, needsRebuild, markBuilt, songPdfDeps } = require('./generator-utils.cjs');
const { buildSongPdf, TRANSPOSE } = require('./buildSongPdf.cjs');

const chordDir = path.resolve(__dirname, '../src/chordpro');
const pdfDir = path.resolve(__dirname, '../pdf');
const dataPath = path.resolve(__dirname, '../src/data/songs.json');
const scriptPath = path.resolve(__dirname, './gen-setlist.cjs');
const cacheFile = path.resolve(__dirname, '../.build-cache.json');

const fullBand = process.argv.includes('--fullband');
const halloween = process.argv.includes('--halloween');
const variantFlag = process.argv.includes('--bb') ? 'bb'
                  : process.argv.includes('--eb') ? 'eb'
                  : null;
const transpose = variantFlag ? TRANSPOSE[variantFlag] : 0;
const variantDir = variantFlag || '';

async function main() {
  let songs = [];
  try {
    songs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (err) {
    console.error('Error reading songs.json:', err.message);
    process.exit(1);
  }

  const filteredSongs = songs
    .filter(song => !song.holding)
    .filter(song => !fullBand || song.instrumentation === 'Full band')
    .filter(song => !halloween || (Array.isArray(song.tags) && song.tags.includes('halloween')))
    .filter(song => !variantFlag || (Array.isArray(song.tags) && song.tags.includes('transpose')));

  fs.mkdirSync(pdfDir, { recursive: true });

  const srcPdfDir = path.resolve(__dirname, '../src/pdf');
  if (fs.existsSync(srcPdfDir)) {
    fs.readdirSync(srcPdfDir)
      .filter(file => file.endsWith('.pdf'))
      .forEach(file => {
        copyIfChanged(path.join(srcPdfDir, file), path.join(pdfDir, file));
      });
  }

  const songPDFs = [];
  const pageNumbers = [];
  let currentPage = 2;

  for (const song of filteredSongs) {
    const pdfPath = path.join(pdfDir, variantDir, `${song.slug}.pdf`);
    const title = song.title;

    if (song.prerendered) {
      if (!fs.existsSync(pdfPath)) {
        console.warn(`Missing pre-rendered PDF: ${pdfPath}`);
        continue;
      }
    } else {
      const deps = [
        ...songPdfDeps({ slug: song.slug, chordDir, dataPath }),
        { label: 'transpose', value: String(transpose) },
      ];

      if (needsRebuild(pdfPath, cacheFile, deps)) {
        try {
          const built = await buildSongPdf({ slug: song.slug, songs, outPath: pdfPath, transpose });
          if (!built) {
            console.warn(`No content for ${song.slug}, skipping PDF generation`);
            continue;
          }
          markBuilt(cacheFile, pdfPath, deps);
        } catch (err) {
          console.error(err.message);
          process.exit(1);
        }
      }

      if (!fs.existsSync(pdfPath)) {
        console.warn(`Missing generated PDF: ${pdfPath}`);
        continue;
      }
    }

    const info = spawnSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
    const match = info.stdout.match(/Pages:\s+(\d+)/);
    const pages = match ? parseInt(match[1], 10) : 1;

    pageNumbers.push({ title, page: currentPage });
    currentPage += pages;
    songPDFs.push(pdfPath);
  }

  const tocLines = pageNumbers.map((entry, i) => {
    return `{comment: ${i + 1}. ${entry.title} ......... ${entry.page}}`;
  });
  const tocCho = `{title: Setlist Table of Contents}\n` + tocLines.join('\n') + '\n';

  const suffix = [
    fullBand ? '-fullband' : '',
    halloween ? '-halloween' : '',
    variantFlag ? '-' + variantFlag : '',
  ].join('');
  const finalOutput = path.join(pdfDir, `setlist${suffix}.pdf`);
  const tocPdfPath = path.join(pdfDir, `__toc__${suffix}.pdf`);

  const tocDeps = [
    { label: 'toc-cho', value: tocCho },
    { path: scriptPath },
  ];

  if (needsRebuild(tocPdfPath, cacheFile, tocDeps)) {
    const tocChoPath = path.join(chordDir, `__toc__${suffix}.tmp.cho`);
    fs.writeFileSync(tocChoPath, tocCho, 'utf8');
    const tocRes = spawnSync('chordpro', [tocChoPath, '-o', tocPdfPath], { stdio: 'inherit' });
    fs.unlinkSync(tocChoPath);
    if (tocRes.error || tocRes.status !== 0) {
      console.error('Failed to generate TOC PDF');
      process.exit(1);
    }
    markBuilt(cacheFile, tocPdfPath, tocDeps);
  }

  const allPdfs = [tocPdfPath, ...songPDFs];
  const mergeDeps = [
    ...allPdfs.map(p => ({ path: p })),
    { path: scriptPath },
    { label: 'variant', value: path.basename(finalOutput) },
  ];

  if (needsRebuild(finalOutput, cacheFile, mergeDeps)) {
    const unite = spawnSync('pdfunite', [...allPdfs, finalOutput], { stdio: 'inherit' });
    if (unite.error || unite.status !== 0) {
      console.error('Failed to merge PDFs');
      process.exit(1);
    }
    markBuilt(cacheFile, finalOutput, mergeDeps);
    console.log(`✅ Wrote setlist PDF to ${finalOutput}`);
  } else {
    console.log(`↺ ${finalOutput} is up to date`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
