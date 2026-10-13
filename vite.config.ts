import { defineConfig, Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

const htmlDir = resolve(__dirname, 'html')
const pdfDir = resolve(__dirname, 'pdf')

function collectHtmlFiles(baseDir: string, subdirs: string[]): { subdir: string; file: string }[] {
  const out: { subdir: string; file: string }[] = []
  for (const sub of subdirs) {
    const dir = sub ? resolve(baseDir, sub) : baseDir
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.html')) continue
      out.push({ subdir: sub, file })
    }
  }
  return out
}

const variantSubdirs = ['', 'bb', 'eb']
const songHTMLs = collectHtmlFiles(htmlDir, variantSubdirs)

const input = {
  main: resolve(__dirname, 'index.html'),
  halloween: resolve(__dirname, 'halloween.html'),
  halloweenHorns: resolve(__dirname, 'halloween-horns.html'),
  printableSongList: resolve(__dirname, 'printable-song-list.html'),
  ...Object.fromEntries(
    songHTMLs.map(({ subdir, file }) => {
      const name = file.replace(/\.html$/, '')
      const key = subdir ? `html/${subdir}/${name}` : `html/${name}`
      const path = subdir ? resolve(htmlDir, subdir, file) : resolve(htmlDir, file)
      return [key, path]
    })
  ),
}

// Copy pdf/ tree into dist/pdf/ at build time, preserving subdirs.
// (Vite's rollup input list can't preserve subdirs for non-HTML entries,
// so we handle PDFs separately as plain static assets.)
function copyPdfTree(): Plugin {
  return {
    name: 'copy-pdf-tree',
    apply: 'build',
    writeBundle: {
      sequential: true,
      handler() {
        if (!fs.existsSync(pdfDir)) return
        const outDir = resolve(__dirname, 'dist', 'pdf')
        fs.mkdirSync(outDir, { recursive: true })
        fs.cpSync(pdfDir, outDir, {
          recursive: true,
          filter: (src) => !path.basename(src).startsWith('__toc__'),
        })
      },
    },
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    copyPdfTree(),
  ],
  server: {
    allowedHosts: ['.ngrok.app', '.ngrok-free.app'],
  },
  build: {
    rollupOptions: {
      input,
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    },
  },
})
