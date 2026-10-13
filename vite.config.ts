import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

import { resolve } from 'path'
import fs from 'fs'

const htmlDir = resolve(__dirname, 'html')
const pdfDir = resolve(__dirname, 'pdf')

function collectFiles(baseDir: string, extension: string, subdirs: string[]): { subdir: string; file: string }[] {
  const out: { subdir: string; file: string }[] = []
  for (const sub of subdirs) {
    const dir = sub ? resolve(baseDir, sub) : baseDir
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(extension)) continue
      if (file.startsWith('__toc__')) continue
      out.push({ subdir: sub, file })
    }
  }
  return out
}

const variantSubdirs = ['', 'bb', 'eb']
const songHTMLs = collectFiles(htmlDir, '.html', variantSubdirs)
const songPDFs = collectFiles(pdfDir, '.pdf', variantSubdirs)

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
  ...Object.fromEntries(
    songPDFs.map(({ subdir, file }) => {
      const name = file.replace(/\.pdf$/, '')
      const key = subdir ? `pdf/${subdir}/${name}` : `pdf/${name}`
      const path = subdir ? resolve(pdfDir, subdir, file) : resolve(pdfDir, file)
      return [key, path]
    })
  ),
}

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    allowedHosts: ['.ngrok.app', '.ngrok-free.app'],
  },
  build: {
    rollupOptions: {
      input,
      output: {
        assetFileNames: assetInfo => {
          if (assetInfo.names[0].endsWith('.pdf')) {
            // keep original name under dist/pdf/
            return 'pdf/[name][extname]'
          }
          // fallback for other assets
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
  },
})
