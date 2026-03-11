export interface TextSegment {
  id: string;
  text: string;
  startChar: number;
  endChar: number;
}

/**
 * Splits text into segments suitable for reading and highlighting.
 * Uses punctuation to define natural pauses and boundaries.
 * 
 * Asynchronous version that yields to the main thread to prevent
 * freezing the UI when parsing massive books (like 400KB+ JSONs).
 */
export const processTextAsync = async (text: string): Promise<TextSegment[]> => {
  if (!text) return [];

  const segments: TextSegment[] = [];
  let accumulatedIndex = 0;

  // 1. Split by paragraphs first to preserve structure
  const paragraphs = text.split(/(\n\s*\n)/);

  for (let i = 0; i < paragraphs.length; i++) {
    const part = paragraphs[i];

    // Yield to the main thread every 50 paragraphs to keep UI responsive
    if (i % 50 === 0 && i !== 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    if (/^\s*$/.test(part)) {
      // It's just whitespace/newlines between paragraphs
      accumulatedIndex += part.length;
      continue;
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
  }

  return segments;
};

// Kept for backward compatibility if needed in fast contexts,
// but ReaderContext should use processTextAsync
export const processText = (text: string): TextSegment[] => {
  if (!text) return [];

  const segments: TextSegment[] = [];
  let accumulatedIndex = 0;

  const paragraphs = text.split(/(\n\s*\n)/);

  paragraphs.forEach((part) => {
    if (/^\s*$/.test(part)) {
      accumulatedIndex += part.length;
      return;
    }

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

