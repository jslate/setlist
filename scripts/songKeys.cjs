// Compute the list of keys/transpositions available for a song.
// Returns an ordered subset of ['concert', 'bb', 'eb'].
//
// Priority:
//   1. explicit `song.keys` wins
//   2. `transpose` tag → all three
//   3. default → concert only

function songKeys(song) {
  if (!song) return ['concert'];
  if (Array.isArray(song.keys) && song.keys.length > 0) return song.keys;
  const tags = Array.isArray(song.tags) ? song.tags : [];
  if (tags.includes('transpose')) return ['concert', 'bb', 'eb'];
  return ['concert'];
}

module.exports = { songKeys };
