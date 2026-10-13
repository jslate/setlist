import './style.css'
import songs from './data/songs.json'
import packs from './data/player-packs.json'
import { songKeys } from './songKeys.js'

const PACK_ID = 'halloween-horns'
const pack = packs[PACK_ID]

const KEY_META = {
  concert: { dir: '', label: 'Concert' },
  bb:      { dir: 'bb', label: 'B♭' },
  eb:      { dir: 'eb', label: 'E♭' },
}

const PILL_PDF   = 'inline-block px-3 py-1 rounded-full text-sm font-medium bg-rose-600 text-white hover:bg-rose-700'
const PILL_HTML  = 'inline-block px-3 py-1 rounded-full text-sm font-medium bg-sky-600 text-white hover:bg-sky-700'
const PILL_OTHER = 'inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300'

function preferredKey(song) {
  const requested = (pack.perSongKey && pack.perSongKey[song.slug]) || pack.defaultKey
  const available = songKeys(song)
  return available.includes(requested) ? requested : 'concert'
}

function render() {
  if (!pack) {
    console.error(`Pack "${PACK_ID}" not found in player-packs.json`)
    return
  }

  const titleEl = document.getElementById('pack-title')
  const subtitleEl = document.getElementById('pack-subtitle')
  const introEl = document.getElementById('pack-intro')
  const fullPdfEl = document.getElementById('pack-full-pdf')
  const zipEl = document.getElementById('pack-zip')
  if (titleEl) titleEl.textContent = pack.title
  if (subtitleEl) subtitleEl.textContent = pack.subtitle
  if (introEl) introEl.textContent = pack.intro
  if (fullPdfEl) fullPdfEl.href = `/pdf/${pack.fullSetlistPdf}`
  if (zipEl) zipEl.href = `/pdf/${pack.zipFile}`

  const container = document.getElementById('songs')
  if (!container) return

  const list = songs
    .filter(s => !s.holding)
    .filter(s => Array.isArray(s.tags) && s.tags.includes(pack.filterTag))

  const ol = document.createElement('ol')
  ol.className = 'space-y-3 list-decimal list-inside'

  list.forEach(song => {
    const preferred = preferredKey(song)
    const prefMeta = KEY_META[preferred]
    const prefSubdir = prefMeta.dir ? `/${prefMeta.dir}` : ''

    const li = document.createElement('li')
    li.className = 'p-3 rounded shadow bg-white'

    const row = document.createElement('div')
    row.className = 'inline-flex flex-wrap items-center gap-3 ml-2'

    const title = document.createElement('span')
    title.className = 'text-lg font-semibold'
    title.textContent = song.title
    row.appendChild(title)

    const keyBadge = document.createElement('span')
    keyBadge.className = 'text-xs uppercase tracking-wide text-gray-500'
    keyBadge.textContent = prefMeta.label
    row.appendChild(keyBadge)

    const pdfLink = document.createElement('a')
    pdfLink.href = `/pdf${prefSubdir}/${song.slug}.pdf`
    pdfLink.textContent = 'PDF'
    pdfLink.className = PILL_PDF
    row.appendChild(pdfLink)

    if (song.hasHtml) {
      const htmlLink = document.createElement('a')
      htmlLink.href = `/html${prefSubdir}/${song.slug}.html`
      htmlLink.textContent = 'HTML'
      htmlLink.className = PILL_HTML
      row.appendChild(htmlLink)
    }

    const otherKeys = songKeys(song).filter(k => k !== preferred)
    if (otherKeys.length > 0) {
      const sep = document.createElement('span')
      sep.className = 'text-xs text-gray-400'
      sep.textContent = 'also:'
      row.appendChild(sep)
      otherKeys.forEach(k => {
        const km = KEY_META[k]
        const sub = km.dir ? `/${km.dir}` : ''
        const link = document.createElement('a')
        link.href = `/pdf${sub}/${song.slug}.pdf`
        link.textContent = km.label
        link.className = PILL_OTHER
        row.appendChild(link)
      })
    }

    li.appendChild(row)
    ol.appendChild(li)
  })

  container.appendChild(ol)
}

render()
