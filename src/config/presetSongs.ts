// Preset songs for "I'm Feeling Lucky" button
// Add or remove video IDs to update the random selection

export const PRESET_SONGS = [
  'KFq4E9XTueY',  // She Bop
  'TMiAQPABgHA',  // LA Woman
  '6iKFn8dlxX8',  // Born Slippy Nuxx
  'uwOOFYDhAQA',  // What Is and What Should Never Be
  'Eab_beh07HU'  // Good Vibrations
]

export function getRandomPresetSong(): string {
  const randomIndex = Math.floor(Math.random() * PRESET_SONGS.length)
  return PRESET_SONGS[randomIndex]
}


