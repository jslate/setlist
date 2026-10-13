import { songKeys } from './songKeys.js'

const KEY_META = {
  concert: { dir: '', label: 'Concert' },
  bb:      { dir: 'bb', label: 'B♭ Instruments' },
  eb:      { dir: 'eb', label: 'E♭ Instruments' },
}

const PILL_BASE = 'inline-block px-3 py-1 rounded-full text-sm font-medium transition-colors'
const PILL_PDF  = `${PILL_BASE} bg-rose-600 text-white hover:bg-rose-700`
const PILL_HTML = `${PILL_BASE} bg-sky-600 text-white hover:bg-sky-700`

function appendVariantGroup(container, song, { kind, extras = [] }) {
  const keys = songKeys(song)
  const multi = keys.length > 1 || extras.length > 0
  const pathPrefix = kind === 'pdf' ? '/pdf' : '/html'
  const extension = kind === 'pdf' ? '.pdf' : '.html'
  const baseLabel = kind === 'pdf' ? 'PDF' : 'HTML'
  const pillClass = kind === 'pdf' ? PILL_PDF : PILL_HTML

  const group = document.createElement('div')
  group.className = 'flex flex-wrap items-center gap-2'

  if (multi) {
    const prefix = document.createElement('span')
    prefix.textContent = `${baseLabel}:`
    prefix.className = 'text-sm font-medium text-gray-700'
    group.appendChild(prefix)
  }

  keys.forEach(key => {
    const meta = KEY_META[key]
    if (!meta) return
    const link = document.createElement('a')
    const subdir = meta.dir ? `/${meta.dir}` : ''
    link.href = `${pathPrefix}${subdir}/${song.slug}${extension}`
    link.textContent = multi ? meta.label : baseLabel
    link.className = pillClass
    group.appendChild(link)
  })

  extras.forEach(extra => {
    const link = document.createElement('a')
    link.href = extra.href
    link.textContent = extra.label
    link.className = pillClass
    group.appendChild(link)
  })

  container.appendChild(group)
}

export function createSongItem(song) {
  const item = document.createElement('li')
  const baseClasses = 'p-4 rounded shadow'
  if (song.holding) {
    item.className = `${baseClasses} bg-white`
  } else if (song.instrumentation === 'Duo') {
    item.className = `${baseClasses} bg-yellow-100`
  } else if (song.instrumentation === 'Full band') {
    item.className = `${baseClasses} bg-blue-100`
  } else {
    item.className = `${baseClasses} bg-white`
  }

  const title = document.createElement('h2')
  title.className = 'text-2xl font-semibold'
  title.textContent = song.title
  item.appendChild(title)

  const meta = document.createElement('p')
  meta.className = 'text-sm text-gray-600'
  const hasInstrumentation = song.instrumentation && song.instrumentation.trim() !== ''
  const hasNotes = song.notes && song.notes.trim() !== ''
  if (hasInstrumentation && hasNotes) {
    meta.textContent = `${song.instrumentation} - ${song.notes}`
  } else if (hasInstrumentation) {
    meta.textContent = song.instrumentation
  } else if (hasNotes) {
    meta.textContent = song.notes
  } else {
    meta.textContent = ''
  }
  item.appendChild(meta)

  if (song.audio) {
    const audio = document.createElement('audio')
    audio.controls = true
    audio.src = song.audio
    audio.className = 'mt-2'
    item.appendChild(audio)
  }

  if (song.slug) {
    const links = document.createElement('div')
    links.className = 'mt-3 flex flex-col gap-2'

    const alternates = (Array.isArray(song.alternates) ? song.alternates : [])
      .map(alt => ({ href: `/pdf/${alt.file}`, label: alt.label }))

    appendVariantGroup(links, song, { kind: 'pdf', extras: alternates })
    if (song.hasHtml) {
      appendVariantGroup(links, song, { kind: 'html' })
    }

    item.appendChild(links)
  }

  return item
}
