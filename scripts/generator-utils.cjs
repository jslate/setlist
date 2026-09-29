#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// deps: array of dep descriptors. Each is one of:
//   { path: string }                                → hash file contents
//   { path: string, jsonFind: { key, value } }      → parse JSON array, hash JSON.stringify of the matching element
//   { label: string, value: string }                → hash a literal string (e.g. a CLI flag)
function computeDepHash(deps) {
  const parts = [];
  for (const dep of deps) {
    if (dep.value !== undefined) {
      parts.push(`${dep.label || 'inline'}=${sha256(String(dep.value))}`);
    } else if (dep.jsonFind) {
      const { key, value } = dep.jsonFind;
      if (!fs.existsSync(dep.path)) {
        parts.push(`${dep.path}#${key}=${value}:missing`);
        continue;
      }
      let entry = null;
      try {
        const arr = JSON.parse(fs.readFileSync(dep.path, 'utf8'));
        if (Array.isArray(arr)) entry = arr.find(x => x && x[key] === value) || null;
      } catch {
        entry = null;
      }
      parts.push(`${dep.path}#${key}=${value}:${sha256(JSON.stringify(entry))}`);
    } else if (dep.path) {
      if (!fs.existsSync(dep.path)) {
        parts.push(`${dep.path}:missing`);
      } else {
        parts.push(`${dep.path}:${sha256(fs.readFileSync(dep.path))}`);
      }
    }
  }
  return sha256(parts.join('\n'));
}

function readCache(cacheFile) {
  if (!fs.existsSync(cacheFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch {
    return {};
  }
}

function writeCache(cacheFile, cache) {
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2) + '\n');
}

function needsRebuild(outputPath, cacheFile, deps) {
  if (!fs.existsSync(outputPath)) return true;
  const cache = readCache(cacheFile);
  return cache[outputPath] !== computeDepHash(deps);
}

function markBuilt(cacheFile, outputPath, deps) {
  const cache = readCache(cacheFile);
  cache[outputPath] = computeDepHash(deps);
  writeCache(cacheFile, cache);
}

function copyIfChanged(srcPath, dstPath) {
  if (!fs.existsSync(srcPath)) return false;
  if (fs.existsSync(dstPath)) {
    const srcHash = sha256(fs.readFileSync(srcPath));
    const dstHash = sha256(fs.readFileSync(dstPath));
    if (srcHash === dstHash) return false;
  }
  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.copyFileSync(srcPath, dstPath);
  return true;
}

// Canonical dep set for a song PDF, used by both gen-pdf and gen-setlist so
// they don't invalidate each other's cache entries for the same output.
function songPdfDeps({ slug, chordDir, dataPath }) {
  return [
    { path: path.join(chordDir, `${slug}.cho`) },
    { path: dataPath, jsonFind: { key: 'slug', value: slug } },
    { path: path.resolve(__dirname, 'prependNotes.cjs') },
    { path: path.resolve(__dirname, 'renderAbc.cjs') },
    { path: path.resolve(__dirname, 'gen-pdf.cjs') },
    { path: path.resolve(__dirname, 'gen-setlist.cjs') },
    { path: __filename },
  ];
}

module.exports = {
  sha256,
  computeDepHash,
  needsRebuild,
  markBuilt,
  copyIfChanged,
  songPdfDeps,
};
