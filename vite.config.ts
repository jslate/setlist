import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

import { resolve } from 'path'
import fs from 'fs'

const htmlDir = resolve(__dirname, 'html')
const pdfDir = resolve(__dirname, 'pdf')

const songHTMLFiles = fs.existsSync(htmlDir)
  ? fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'))
  : []

const songPDFFiles = fs.existsSync(pdfDir)
  ? fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'))
  : []

const input = {
  main: resolve(__dirname, 'index.html'),
  ...Object.fromEntries(
    songHTMLFiles.map(file => {
      const name = file.replace(/\.html$/, '')
      return [`html/${name}`, resolve(htmlDir, file)]
    })
  ),
  ...Object.fromEntries(
    songPDFFiles.map(file => {
      const name = file.replace(/\.pdf$/, '')
      return [`pdf/${name}`, resolve(pdfDir, file)]
    })
  ),
}

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
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
