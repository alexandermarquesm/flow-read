export interface TextSegment {
  id: string;
  text: string;
  startChar: number;
  endChar: number;
}

/**
 * Splits text into segments suitable for reading and highlighting.
 * Uses punctuation to define natural pauses and boundaries.
 */
export const processText = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  // Regex to split by sentences or major punctuation, keeping the delimiter
  // This is a simplified approach; for more complex texts, a more robust parser might be needed.
  // We match sentences ending in . ? ! or newlines.
  const regex = /([^.?!]+[.?!]+)|([^.?!]+$)/gm;

  let accumulatedIndex = 0;

  // If text is empty, return empty array
  if (!text) return [];

  const sentences = text.match(regex);
  if (!sentences) {
    // Fallback if regex fails (unlikely for non-empty text based on the pattern)
    return [
      {
        id: "seg-0",
        text: text,
        startChar: 0,
        endChar: text.length,
      },
    ];
  }

  sentences.forEach((sentence, index) => {
    // We match sentences ending in . ? ! or newlines.
    // To map perfectly to `onboundary` charIndex, we need the exact position in the original string.

    const start = text.indexOf(sentence, accumulatedIndex);
    const end = start + sentence.length;

    segments.push({
      id: `seg-${index}`,
      text: sentence,
      startChar: start,
      endChar: end,
    });

    accumulatedIndex = end;
  });

  return segments;
};
