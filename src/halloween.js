import './style.css'
import songs from './data/songs.json'
import { createSongItem } from './songItem.js'

const container = document.getElementById('songs')

if (container) {
  const halloweenSongs = songs
    .filter(song => !song.holding)
    .filter(song => Array.isArray(song.tags) && song.tags.includes('halloween'))

  if (halloweenSongs.length) {
    const list = document.createElement('ul')
    list.className = 'space-y-4'
    halloweenSongs.forEach(song => {
      list.appendChild(createSongItem(song))
    })
    container.appendChild(list)
  } else {
    const empty = document.createElement('p')
    empty.className = 'text-gray-600'
    empty.textContent = 'No Halloween songs yet.'
    container.appendChild(empty)
  }
}
