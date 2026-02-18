import React from "react";
import styles from "../Reader/Reader.module.css";

interface ActiveSegmentProps {
  text: string;
  currentIndex: number;
}

export const ActiveSegment: React.FC<ActiveSegmentProps> = ({
  text,
  currentIndex,
}) => {
  const tokens: { text: string; start: number; end: number }[] = [];
  const regex = /([^\s]+|\s+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return (
    <>
      {tokens.map((token, i) => {
        const isWord = /\S/.test(token.text);

        // Logic: active if token.start <= currentIndex < nextToken.start
        // If it's the last token, we just check if index >= start
        const nextTokenStart = tokens[i + 1]
          ? tokens[i + 1].start
          : Number.MAX_SAFE_INTEGER;

        const isMatch =
          token.start <= currentIndex && currentIndex < nextTokenStart;

        return (
          <span
            key={i}
            className={isMatch && isWord ? styles.wordActive : undefined}
            data-debug={`start:${token.start} curr:${currentIndex} match:${isMatch}`}
          >
            {token.text}
          </span>
        );
      })}
    </>
  );
};
