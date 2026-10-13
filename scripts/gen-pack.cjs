#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { songKeys } = require('./songKeys.cjs');

const pdfDir = path.resolve(__dirname, '../pdf');
const dataPath = path.resolve(__dirname, '../src/data/songs.json');
const packsPath = path.resolve(__dirname, '../src/data/player-packs.json');

function keyToSubdir(key) { return key === 'concert' ? '' : key; }

function preferredKey(song, pack) {
  const requested = (pack.perSongKey && pack.perSongKey[song.slug]) || pack.defaultKey;
  const available = songKeys(song);
  return available.includes(requested) ? requested : 'concert';
}

function buildPack(packId, pack, songs) {
  const list = songs
    .filter(s => !s.holding)
    .filter(s => Array.isArray(s.tags) && s.tags.includes(pack.filterTag));

  if (list.length === 0) {
    console.warn(`pack "${packId}": no songs matched filterTag=${pack.filterTag}`);
    return;
  }

  const tmpDir = path.join(pdfDir, `.pack-${packId}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const copiedPaths = [];
  const missing = [];
  list.forEach((song, i) => {
    const key = preferredKey(song, pack);
    const sub = keyToSubdir(key);
    const srcPath = sub ? path.join(pdfDir, sub, `${song.slug}.pdf`) : path.join(pdfDir, `${song.slug}.pdf`);
    if (!fs.existsSync(srcPath)) {
      missing.push({ slug: song.slug, key, srcPath });
      return;
    }
    const n = String(i + 1).padStart(2, '0');
    const dstName = `${n}-${song.slug}-${key}.pdf`;
    const dstPath = path.join(tmpDir, dstName);
    fs.copyFileSync(srcPath, dstPath);
    copiedPaths.push(dstPath);
  });

  for (const m of missing) {
    console.warn(`  missing: ${m.slug} (${m.key}) at ${m.srcPath}`);
  }

  if (copiedPaths.length === 0) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.error(`pack "${packId}": no PDFs found; nothing to zip`);
    process.exit(1);
  }

  const zipPath = path.join(pdfDir, pack.zipFile);
  fs.rmSync(zipPath, { force: true });
  const res = spawnSync('zip', ['-j', '-q', zipPath, ...copiedPaths]);
  if (res.error || res.status !== 0) {
    console.error(`zip failed for pack "${packId}":`, res.stderr && res.stderr.toString());
    process.exit(1);
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`✅ Wrote ${zipPath} (${copiedPaths.length} charts)`);
}

function main() {
  const songs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const packs = JSON.parse(fs.readFileSync(packsPath, 'utf8'));

  const requested = process.argv[2];
  const packIds = requested ? [requested] : Object.keys(packs);
  for (const id of packIds) {
    const pack = packs[id];
    if (!pack) {
      console.error(`unknown pack: ${id}`);
      process.exit(1);
    }
    buildPack(id, pack, songs);
  }
}

main();
