#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getAnnotatedChordProContent } = require('./prependNotes.cjs');
const { preprocessAbc } = require('./renderAbc.cjs');

const chordDir = path.resolve(__dirname, '../src/chordpro');
const abcRenderedDir = path.resolve(__dirname, '../src/abc-rendered');

const TRANSPOSE = {
  concert: 0,
  bb: 2,   // written for Bb instruments: up a major 2nd
  eb: 9,   // written for Eb instruments: up a major 6th (prefers sharp spellings over flat)
};

async function buildSongPdf({ slug, songs, outPath, transpose = 0 }) {
  let content = getAnnotatedChordProContent(slug, chordDir, songs);
  if (!content || content.trim() === '') return false;

  ({ content } = await preprocessAbc(content, {
    slug,
    renderedDir: abcRenderedDir,
    visualTranspose: transpose,
  }));

  const tag = transpose === 0 ? '' : `.t${transpose}`;
  const tempPath = path.join(chordDir, `${slug}${tag}.tmp.cho`);
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const args = [tempPath, '-G', '-o', outPath];
  if (transpose !== 0) args.push(`--transpose=${transpose}`);

  const res = spawnSync('chordpro', args, { stdio: 'inherit' });
  fs.unlinkSync(tempPath);
  if (res.error || res.status !== 0) {
    throw new Error(`chordpro failed for ${slug} (transpose=${transpose})`);
  }
  return true;
}

module.exports = { buildSongPdf, TRANSPOSE };
