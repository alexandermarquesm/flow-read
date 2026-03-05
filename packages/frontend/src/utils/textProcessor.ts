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
  if (!text) return [];

  const segments: TextSegment[] = [];
  let accumulatedIndex = 0;

  // 1. Split by paragraphs first to preserve structure
  const paragraphs = text.split(/(\n\s*\n)/);

  paragraphs.forEach((part) => {
    if (/^\s*$/.test(part)) {
      // It's just whitespace/newlines between paragraphs
      accumulatedIndex += part.length;
      return;
    }

    // 2. Split each paragraph into sentences
    const sentenceRegex = /([^.?!]+[.?!]+)|([^.?!]+$)/g;
    let match;

    while ((match = sentenceRegex.exec(part)) !== null) {
      const sentence = match[0];
      const start = text.indexOf(sentence, accumulatedIndex);

      if (start !== -1) {
        segments.push({
          id: `seg-${segments.length}`,
          text: sentence,
          startChar: start,
          endChar: start + sentence.length,
        });
        accumulatedIndex = start + sentence.length;
      }
    }
  });

  return segments;
};
