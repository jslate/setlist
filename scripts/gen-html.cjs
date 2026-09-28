#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { isOutputStale } = require('./generator-utils.cjs');
const { preprocessAbc, extractAbcBlocks } = require('./renderAbc.cjs');

const chordDir = path.resolve(__dirname, '../src/chordpro');
const outDir = path.resolve(__dirname, '../html');
const stylePath = path.resolve(__dirname, '../src/style.css');
const abcRenderedDir = path.resolve(__dirname, '../src/abc-rendered');
const abcScriptPath = path.resolve(__dirname, './renderAbc.cjs');
const scriptPath = path.resolve(__dirname, './gen-html.cjs');

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(chordDir).filter(f => f.endsWith('.cho'));
  for (const file of files) {
    const slug = path.basename(file, '.cho');
    const srcPath = path.join(chordDir, file);
    const dstPath = path.join(outDir, `${slug}.html`);
    const dependencies = [srcPath, stylePath, abcScriptPath, scriptPath];

    if (!isOutputStale(dstPath, dependencies)) {
      continue;
    }

    // If the source has ABC blocks, preprocess through a temp file
    const raw = fs.readFileSync(srcPath, 'utf8');
    const hasAbc = extractAbcBlocks(raw).length > 0;

    let choPathForChordpro = srcPath;
    let tempPath = null;
    let abcImages = [];
    if (hasAbc) {
      const { content: processed, images } = await preprocessAbc(raw, { slug, renderedDir: abcRenderedDir });
      abcImages = images;
      tempPath = path.join(chordDir, `${slug}.tmp.cho`);
      fs.writeFileSync(tempPath, processed, 'utf8');
      choPathForChordpro = tempPath;
    }

    const res = spawnSync('chordpro', [choPathForChordpro, '-o', dstPath]);
    if (tempPath) fs.unlinkSync(tempPath);
    if (res.error || res.status !== 0) {
      console.error(`Error generating HTML for ${file}:`, res.stderr && res.stderr.toString());
      process.exit(1);
    }

    let html = fs.readFileSync(dstPath, 'utf8');

    html = html.replace(/<head>\s*/i, `<head>
<link rel="stylesheet" href="/src/style.css">
`);

    html = html.replace(/class="(title)"/g, 'class="$1 font-bold text-2xl mb-4"');
    html = html.replace(/class="(verse)"/g, 'class="$1 whitespace-pre-wrap bg-gray-100 p-2 rounded mb-4"');
    html = html.replace(/class="(songline)"/g, 'class="$1 border-separate border-spacing-1 mb-2"');

    // Patch empty <img src=""/> tags (chordpro's HTML backend drops the src)
    if (abcImages.length > 0) {
      const webAbcDir = path.join(outDir, 'abc-rendered');
      fs.mkdirSync(webAbcDir, { recursive: true });
      let i = 0;
      html = html.replace(/<img\b[^>]*\bsrc=""[^>]*\/?>/g, () => {
        const img = abcImages[i++];
        if (!img) return '';
        fs.copyFileSync(img.absPath, path.join(webAbcDir, img.filename));
        const alt = (img.label || 'ABC notation').replace(/"/g, '&quot;');
        return `<img src="abc-rendered/${img.filename}" alt="${alt}" class="max-w-full my-4" />`;
      });
    }

    fs.writeFileSync(dstPath, html, 'utf8');
  }

  console.log('Generated and styled HTML pages in html');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
