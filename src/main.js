import './style.css'
import songs from './data/songs.json'

const songsContainer = document.getElementById('songs')

function createSongItem(song) {
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
    links.className = 'mt-2 space-x-4'

    const pdfLink = document.createElement('a')
    pdfLink.href = `/pdf/${song.slug}.pdf`
    pdfLink.textContent = 'PDF'
    pdfLink.className = 'text-blue-500 hover:underline'
    links.appendChild(pdfLink)

    const htmlLink = document.createElement('a')
    htmlLink.href = `/html/${song.slug}.html`
    htmlLink.textContent = 'HTML'
    htmlLink.className = 'text-blue-500 hover:underline'
    links.appendChild(htmlLink)

    item.appendChild(links)
  }

  return item
}

if (songsContainer) {
  const regularSongs = songs.filter(song => !song.holding)
  if (regularSongs.length) {
    const list = document.createElement('ul')
    list.className = 'space-y-4'
    regularSongs.forEach(song => {
      list.appendChild(createSongItem(song))
    })
    songsContainer.appendChild(list)
  }

  const holdingSongs = songs.filter(song => song.holding)
  if (holdingSongs.length) {
    const heading = document.createElement('h2')
    heading.className = 'text-2xl font-bold mt-8 mb-4'
    heading.textContent = 'Holding Bin'
    songsContainer.appendChild(heading)

    const list = document.createElement('ul')
    list.className = 'space-y-4'
    holdingSongs.forEach(song => {
      list.appendChild(createSongItem(song))
    })
    songsContainer.appendChild(list)
  }
}
