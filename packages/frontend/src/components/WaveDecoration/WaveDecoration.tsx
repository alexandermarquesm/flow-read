import React from "react";

interface WaveDecorationProps {
  className?: string;
  color?: string;
}

export const WaveDecoration: React.FC<WaveDecorationProps> = ({
  className,
  color = "#D7CCC8", // Default soft brownish/beige
}) => {
  // Wave configuration
  const width = 300;
  const height = 16;
  const centerY = height / 2;
  const segmentWidth = 12; // Wider segments = lower frequency (was 5)
  const amplitude = 5; // Control point vertical offset (affects height)

  const bumps = [];
  // Generate Q/T path segments
  // Start with Quadratic curve for first bump
  // Then T for subsequent mirrored bumps (smooth connection)

  // Starting point: M 0 centerY
  // First curve: Q (segmentWidth/2) (centerY - amplitude) (segmentWidth) centerY
  const dStart = `M 0 ${centerY} Q ${segmentWidth / 2} ${centerY - amplitude} ${segmentWidth} ${centerY}`;

  for (let x = segmentWidth * 2; x <= width + segmentWidth; x += segmentWidth) {
    bumps.push(`T ${x} ${centerY}`);
  }

  const d = `${dStart} ${bumps.join(" ")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d={d}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
