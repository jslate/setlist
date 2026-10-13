#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { needsRebuild, markBuilt } = require('./generator-utils.cjs');
const { preprocessAbc, extractAbcBlocks } = require('./renderAbc.cjs');
const { TRANSPOSE } = require('./buildSongPdf.cjs');
const { songKeys } = require('./songKeys.cjs');

const chordDir = path.resolve(__dirname, '../src/chordpro');
const outDir = path.resolve(__dirname, '../html');
const stylePath = path.resolve(__dirname, '../src/style.css');
const songPagePath = path.resolve(__dirname, '../src/songPage.js');
const dataPath = path.resolve(__dirname, '../src/data/songs.json');
const abcRenderedDir = path.resolve(__dirname, '../src/abc-rendered');
const abcScriptPath = path.resolve(__dirname, './renderAbc.cjs');
const scriptPath = path.resolve(__dirname, './gen-html.cjs');
const buildScriptPath = path.resolve(__dirname, './buildSongPdf.cjs');
const cacheFile = path.resolve(__dirname, '../.build-cache.json');

const VARIANTS = [
  { name: 'concert', dir: '', transpose: TRANSPOSE.concert, label: 'Concert', requiresTag: null },
  { name: 'bb',      dir: 'bb', transpose: TRANSPOSE.bb,    label: 'B♭',   requiresTag: 'transpose' },
  { name: 'eb',      dir: 'eb', transpose: TRANSPOSE.eb,    label: 'E♭',   requiresTag: 'transpose' },
];

function songMetaBySlug(slug) {
  try {
    const songs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return songs.find(s => s && s.slug === slug) || null;
  } catch {
    return null;
  }
}

function keySwitcher(slug, currentVariantName, availableVariants) {
  if (availableVariants.length < 2) return '';
  const items = availableVariants.map(v => {
    const href = v.dir ? `/html/${v.dir}/${slug}.html` : `/html/${slug}.html`;
    if (v.name === currentVariantName) {
      return `<strong>${v.label}</strong>`;
    }
    return `<a href="${href}">${v.label}</a>`;
  });
  return `<span class="key-switcher">Key: ${items.join(' &middot; ')}</span>`;
}

async function buildOne({ slug, variant, meta, availableVariants }) {
  const srcPath = path.join(chordDir, `${slug}.cho`);
  const dstDir = variant.dir ? path.join(outDir, variant.dir) : outDir;
  const dstPath = path.join(dstDir, `${slug}.html`);
  fs.mkdirSync(dstDir, { recursive: true });

  const raw = fs.readFileSync(srcPath, 'utf8');
  const hasAbc = extractAbcBlocks(raw).length > 0;

  let processed = raw;
  let abcImages = [];
  if (hasAbc) {
    const result = await preprocessAbc(raw, {
      slug,
      renderedDir: abcRenderedDir,
      visualTranspose: variant.transpose,
    });
    processed = result.content;
    abcImages = result.images;
  }

  const tempSuffix = variant.transpose === 0 ? '' : `.t${variant.transpose}`;
  const tempPath = path.join(chordDir, `${slug}${tempSuffix}.tmp.cho`);
  fs.writeFileSync(tempPath, processed, 'utf8');

  const args = [tempPath, '-o', dstPath];
  if (variant.transpose !== 0) args.push(`--transpose=${variant.transpose}`);
  const res = spawnSync('chordpro', args);
  fs.unlinkSync(tempPath);
  if (res.error || res.status !== 0) {
    throw new Error(`chordpro failed for ${slug} (${variant.name}): ${res.stderr && res.stderr.toString()}`);
  }

  const raw2 = fs.readFileSync(dstPath, 'utf8');
  const bodyMatch = raw2.match(/<body>([\s\S]*)<\/body>/i);
  const songMarkup = (bodyMatch ? bodyMatch[1] : raw2).trim();

  let patchedSong = songMarkup;
  if (abcImages.length > 0) {
    const webAbcDir = path.join(dstDir, 'abc-rendered');
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

  const scrollSpeed = meta && Number.isFinite(meta.scrollSpeed) ? meta.scrollSpeed : null;
  const title = (meta && meta.title) || slug;
  const scrollAttr = scrollSpeed ? ` data-scroll-speed="${scrollSpeed}"` : '';
  const slugAttr = ` data-slug="${escapeHtml(slug)}"`;
  const switcher = keySwitcher(slug, variant.name, availableVariants);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}${variant.transpose !== 0 ? ` (${variant.label})` : ''}</title>
<link rel="stylesheet" href="/src/style.css">
<script type="module" src="/src/songPage.js"></script>
</head>
<body class="song-page"${slugAttr}${scrollAttr}>
<div class="song-header"><a href="/">← Back to setlist</a>${switcher ? ' ' + switcher : ''}</div>
${patchedSong}
</body>
</html>
`;

  fs.writeFileSync(dstPath, html, 'utf8');
  return dstPath;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(chordDir).filter(f => f.endsWith('.cho'));
  for (const file of files) {
    const slug = path.basename(file, '.cho');
    const meta = songMetaBySlug(slug);
    if (meta && meta.prerendered) continue;
    const keys = songKeys(meta);
    const availableVariants = VARIANTS.filter(v => keys.includes(v.name));

    for (const variant of availableVariants) {
      const srcPath = path.join(chordDir, file);
      const dstPath = variant.dir
        ? path.join(outDir, variant.dir, `${slug}.html`)
        : path.join(outDir, `${slug}.html`);
      const deps = [
        { path: srcPath },
        { path: stylePath },
        { path: songPagePath },
        { path: abcScriptPath },
        { path: buildScriptPath },
        { path: scriptPath },
        { path: dataPath, jsonFind: { key: 'slug', value: slug } },
        { label: 'transpose', value: String(variant.transpose) },
        { label: 'available-variants', value: availableVariants.map(v => v.name).join(',') },
      ];

      if (!needsRebuild(dstPath, cacheFile, deps)) continue;

      try {
        await buildOne({ slug, variant, meta, availableVariants });
        markBuilt(cacheFile, dstPath, deps);
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    }
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
