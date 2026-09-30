#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { needsRebuild, markBuilt } = require('./generator-utils.cjs');
const { preprocessAbc, extractAbcBlocks } = require('./renderAbc.cjs');

const chordDir = path.resolve(__dirname, '../src/chordpro');
const outDir = path.resolve(__dirname, '../html');
const stylePath = path.resolve(__dirname, '../src/style.css');
const songPagePath = path.resolve(__dirname, '../src/songPage.js');
const dataPath = path.resolve(__dirname, '../src/data/songs.json');
const abcRenderedDir = path.resolve(__dirname, '../src/abc-rendered');
const abcScriptPath = path.resolve(__dirname, './renderAbc.cjs');
const scriptPath = path.resolve(__dirname, './gen-html.cjs');
const cacheFile = path.resolve(__dirname, '../.build-cache.json');

function songMetaBySlug(slug) {
  try {
    const songs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return songs.find(s => s && s.slug === slug) || null;
  } catch {
    return null;
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(chordDir).filter(f => f.endsWith('.cho'));
  for (const file of files) {
    const slug = path.basename(file, '.cho');
    const srcPath = path.join(chordDir, file);
    const dstPath = path.join(outDir, `${slug}.html`);
    const deps = [
      { path: srcPath },
      { path: stylePath },
      { path: songPagePath },
      { path: abcScriptPath },
      { path: scriptPath },
      { path: dataPath, jsonFind: { key: 'slug', value: slug } },
    ];

    if (!needsRebuild(dstPath, cacheFile, deps)) {
      continue;
    }

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

    // Extract the chordpro-emitted body (just the <div class="song">...</div> block)
    // and drop chordpro's default stylesheet links — we own the styling.
    const raw2 = fs.readFileSync(dstPath, 'utf8');
    const bodyMatch = raw2.match(/<body>([\s\S]*)<\/body>/i);
    const songMarkup = (bodyMatch ? bodyMatch[1] : raw2).trim();

    // Patch empty <img src=""/> tags (chordpro's HTML backend drops the src)
    let patchedSong = songMarkup;
    if (abcImages.length > 0) {
      const webAbcDir = path.join(outDir, 'abc-rendered');
      fs.mkdirSync(webAbcDir, { recursive: true });
      let i = 0;
      patchedSong = patchedSong.replace(/<img\b[^>]*\bsrc=""[^>]*\/?>/g, () => {
        const img = abcImages[i++];
        if (!img) return '';
        fs.copyFileSync(img.absPath, path.join(webAbcDir, img.filename));
        const alt = (img.label || 'ABC notation').replace(/"/g, '&quot;');
        return `<img src="abc-rendered/${img.filename}" alt="${alt}" />`;
      });
    }

    const meta = songMetaBySlug(slug);
    const scrollSpeed = meta && Number.isFinite(meta.scrollSpeed) ? meta.scrollSpeed : null;
    const title = (meta && meta.title) || slug;
    const scrollAttr = scrollSpeed ? ` data-scroll-speed="${scrollSpeed}"` : '';
    const slugAttr = ` data-slug="${escapeHtml(slug)}"`;

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/src/style.css">
<script type="module" src="/src/songPage.js"></script>
</head>
<body class="song-page"${slugAttr}${scrollAttr}>
<div class="song-header"><a href="/">← Back to setlist</a></div>
${patchedSong}
</body>
</html>
`;

    fs.writeFileSync(dstPath, html, 'utf8');
    markBuilt(cacheFile, dstPath, deps);
  }

  console.log('Generated and styled HTML pages in html');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
