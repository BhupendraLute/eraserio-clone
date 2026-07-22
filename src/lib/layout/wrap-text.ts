import { measureTextWidth } from './text-measure';

// Splits a single word that's too wide to fit on its own line, breaking
// at character boundaries. Used only as a fallback inside wrapLabel —
// most words never hit this path.
function breakLongWord(word: string, font: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';

  for (const char of word) {
    const candidate = current + char;
    if (current !== '' && measureTextWidth(candidate, font) > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current !== '') lines.push(current);

  // A maxWidth smaller than a single character's width (pathologically
  // narrow node) would otherwise produce an infinite-feeling result —
  // guard by always returning at least one line.
  return lines.length > 0 ? lines : [word];
}

// Greedy word-wrap: adds words to the current line until the next word
// would exceed maxWidth, then starts a new line. A word that's wider
// than maxWidth on its own (long identifiers, URLs) falls back to
// character-level breaking via breakLongWord.
export function wrapLabel(label: string, font: string, maxWidth: number): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const wordWidth = measureTextWidth(word, font);

    if (wordWidth > maxWidth) {
      // Flush whatever was building up before handling the long word.
      if (currentLine !== '') {
        lines.push(currentLine);
        currentLine = '';
      }
      const brokenPieces = breakLongWord(word, font, maxWidth);
      // All but the last piece are complete lines on their own.
      lines.push(...brokenPieces.slice(0, -1));
      // The last piece becomes the new current line, so a short word
      // right after a long one can still pack onto the same line.
      currentLine = brokenPieces[brokenPieces.length - 1];
      continue;
    }

    if (currentLine === '') {
      currentLine = word;
      continue;
    }

    const candidate = `${currentLine} ${word}`;
    if (measureTextWidth(candidate, font) <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine !== '') lines.push(currentLine);

  return lines;
}