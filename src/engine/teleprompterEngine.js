// Teleprompter scroll position math and word/offset helpers.
//
// scrollPosition is a character offset into project.script and is the single
// source of truth shared by the teleprompter, the production view and the cue
// firing engine.

// Average word length per spec = 5 characters.
export function charactersPerSecond(wpm) {
  return (wpm * 5) / 60;
}

// Advance amount for one animation frame. deltaMs is milliseconds since the
// previous frame. slow mode runs at 40% of the current wpm rate.
export function advance(position, wpm, deltaMs, slow) {
  const rate = charactersPerSecond(wpm) * (slow ? 0.4 : 1);
  return position + rate * (deltaMs / 1000);
}

// Tokenize the script into words with their character offsets. Memoize at the
// call site — this only changes when the script changes.
export function getWords(script) {
  const words = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(script)) !== null) {
    words.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return words;
}

// Index of the word containing (or most recently passed by) a char offset.
// Binary search so large scripts stay cheap at 60fps.
export function wordIndexAt(words, offset) {
  if (words.length === 0) return -1;
  let lo = 0;
  let hi = words.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (words[mid].start <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// Character offset reached by jumping deltaWords words from the current
// position. Used by jump-back / jump-forward controls.
export function jumpWords(words, offset, deltaWords) {
  if (words.length === 0) return 0;
  const idx = wordIndexAt(words, offset);
  const target = Math.min(words.length - 1, Math.max(0, idx + deltaWords));
  return words[target].start;
}

// The word at a given offset, for display in the cue editor ("offset 284 =
// 'framing'").
export function wordAtOffset(script, offset) {
  const words = getWords(script);
  const idx = wordIndexAt(words, offset);
  return idx >= 0 ? words[idx].text : "";
}
