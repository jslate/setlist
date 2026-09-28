import './style.css'
import songs from './data/songs.json'
import { createSongItem } from './songItem.js'

const songsContainer = document.getElementById('songs')

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
