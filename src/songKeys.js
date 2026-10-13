// Compute the list of keys/transpositions available for a song.
// Mirror of scripts/songKeys.cjs for the frontend.

export function songKeys(song) {
  if (!song) return ['concert']
  if (Array.isArray(song.keys) && song.keys.length > 0) return song.keys
  const tags = Array.isArray(song.tags) ? song.tags : []
  if (tags.includes('transpose')) return ['concert', 'bb', 'eb']
  return ['concert']
}
