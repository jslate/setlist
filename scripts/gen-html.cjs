#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const chordDir = path.resolve(__dirname, '../src/chordpro');
const outDir = path.resolve(__dirname, '../html');

// Ensure output directory exists
fs.mkdirSync(outDir, { recursive: true });

// Generate and style each HTML file
fs.readdirSync(chordDir)
  .filter(f => f.endsWith('.cho'))
  .forEach(file => {
    const slug = path.basename(file, '.cho');
    const srcPath = path.join(chordDir, file);
    const dstPath = path.join(outDir, `${slug}.html`);

    // Run chordpro to generate raw HTML
    const res = spawnSync('chordpro', [srcPath, '-o', dstPath]);
    if (res.error || res.status !== 0) {
      console.error(`Error generating HTML for ${file}:`, res.stderr.toString());
      process.exit(1);
    }

    // Read and patch the generated HTML
    let html = fs.readFileSync(dstPath, 'utf8');

    // Inject Tailwind stylesheet link
    html = html.replace(/<head>\s*/i, `<head>
<link rel="stylesheet" href="/src/style.css">
`);

    // Inject Tailwind classes on .title, .verse, and .songline elements
    html = html.replace(/class="(title)"/g, 'class="$1 font-bold text-2xl mb-4"');
    html = html.replace(/class="(verse)"/g, 'class="$1 whitespace-pre-wrap bg-gray-100 p-2 rounded mb-4"');
    html = html.replace(/class="(songline)"/g, 'class="$1 border-separate border-spacing-1 mb-2"');

    fs.writeFileSync(dstPath, html, 'utf8');
  });

console.log('Generated and styled HTML pages in html');