import songs from './data/songs.json'

const container = document.getElementById('setlist')

if (container) {
  const regularSongs = songs.filter(song => !song.holding)
  regularSongs.forEach(song => {
    const item = document.createElement('li')
    item.textContent = song.title
    container.appendChild(item)
  })
}
