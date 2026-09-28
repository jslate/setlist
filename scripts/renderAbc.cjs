#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let jsdomInitialized = false;
let abcjs;
function ensureAbcjs() {
  if (jsdomInitialized) return abcjs;
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="abc-paper"></div></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  abcjs = require('abcjs');
  jsdomInitialized = true;
  return abcjs;
}

const BLOCK_RE = /\{start_of_abc(?::\s*([^}]*))?\}\s*\n([\s\S]*?)\n\s*\{end_of_abc\}/g;

const DEFAULTS = { width: 480, staffwidth: 500 };

function parseHeader(header) {
  if (!header) return { label: '', params: {} };
  const [labelRaw, ...rest] = header.split('|');
  const label = labelRaw.trim();
  const params = {};
  if (rest.length > 0) {
    for (const kv of rest.join(' ').split(/\s+/)) {
      if (!kv) continue;
      const eq = kv.indexOf('=');
      if (eq === -1) continue;
      params[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim();
    }
  }
  return { label, params };
}

function extractAbcBlocks(content) {
  const blocks = [];
  let m;
  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(content)) !== null) {
    const { label, params } = parseHeader(m[1] || '');
    blocks.push({
      match: m[0],
      label,
      params,
      body: m[2],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return blocks;
}

function hashAbc(label, body, params) {
  const paramStr = Object.entries(params).sort().map(([k, v]) => `${k}=${v}`).join(',');
  return crypto.createHash('sha1').update(label + '\n' + paramStr + '\n' + body).digest('hex').slice(0, 10);
}

async function renderAbcBlockToPng(label, body, params, outPath) {
  const abcjs = ensureAbcjs();
  const sharp = require('sharp');

  const paper = document.getElementById('abc-paper');
  paper.innerHTML = '';
  const abc = body;
  const staffwidth = Number(params.staffwidth) || DEFAULTS.staffwidth;
  const opts = {
    staffwidth,
    paddingtop: 0,
    paddingbottom: 0,
    paddingleft: 0,
    paddingright: 0,
  };
  if (params.scale) opts.scale = Number(params.scale);
  abcjs.renderAbc('abc-paper', abc, opts);

  const svgEl = paper.querySelector('svg');
  if (!svgEl) throw new Error('abcjs did not produce an svg');
  let svg = svgEl.outerHTML;
  if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  svg = svg.replace(/currentColor/g, 'black');
  svg = svg.replace(/&nbsp;/g, '&#160;');

  await sharp(Buffer.from(svg), { density: 200 })
    .trim({ background: '#ffffff', threshold: 10 })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(outPath);
}

async function preprocessAbc(content, { slug, renderedDir }) {
  const blocks = extractAbcBlocks(content);
  if (blocks.length === 0) return { content, images: [] };

  fs.mkdirSync(renderedDir, { recursive: true });

  const replacements = [];
  const images = [];
  for (const block of blocks) {
    const hash = hashAbc(block.label, block.body, block.params);
    const filename = `${slug}-${hash}.png`;
    const absPath = path.join(renderedDir, filename);
    if (!fs.existsSync(absPath)) {
      await renderAbcBlockToPng(block.label, block.body, block.params, absPath);
    }
    const attrs = [`src="${absPath}"`];
    const width = block.params.width ? Number(block.params.width) : DEFAULTS.width;
    if (width) attrs.push(`width=${width}`);
    if (block.params.height) attrs.push(`height=${Number(block.params.height)}`);
    const imgDirective = `{image: ${attrs.join(' ')}}`;
    const directive = block.label ? `{comment: ${block.label}}\n${imgDirective}` : imgDirective;
    replacements.push({ start: block.start, end: block.end, text: directive });
    images.push({ label: block.label, absPath, filename });
  }

  let out = '';
  let cursor = 0;
  for (const r of replacements) {
    out += content.slice(cursor, r.start) + r.text;
    cursor = r.end;
  }
  out += content.slice(cursor);
  return { content: out, images };
}

module.exports = { preprocessAbc, extractAbcBlocks, hashAbc };
