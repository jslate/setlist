#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function getAnnotatedChordProContent(slug, chordDir, songs) {
  const song = songs.find(s => s.slug === slug);
  const choPath = path.join(chordDir, `${slug}.cho`);
  if (!fs.existsSync(choPath)) return null;

  let content = fs.readFileSync(choPath, 'utf8');

  let notes = '';
  if (song?.notes) notes += song.notes;
  if (song?.reference) {
    notes += (notes ? ' ' : '') + `Reference track: ${song.reference}`;
  }

  if (notes) {
    content = `{comment: ${notes}}\n\n` + content;
  }

  return content;
}

module.exports = { getAnnotatedChordProContent };
