import React from 'react';

interface GridIconProps {
  mode: 1 | 2 ;
  filled?: boolean;
  size?: number;
}

const GridIcon: React.FC<GridIconProps> = ({ mode, filled = false, size = 48 }) => {
  /* inherit from parent (CommandBar) which now gets var(--text) */
  const strokeColor = 'currentColor';
  const fillColor   = filled ? 'currentColor' : 'transparent';
  // Increase stroke width for more thickness
  const strokeWidth = filled ? 2.2 : 2.5;


  const spacingMap = {
    1: { count: 1, spacing: 0, padding: 4 },
    2: { count: 2, spacing: 6, padding: 4 },
  };


  const { count, spacing, padding } = spacingMap[mode];
  const totalSpacing = spacing * (count - 1);

  const boxSize = (size - totalSpacing - padding * 2) / count;
  const radius = mode === 2 ? boxSize * 0.15 : boxSize * 0.25;

  const offset = padding;

  const squares = Array.from({ length: count * count }, (_, i) => {
    const x = i % count;
    const y = Math.floor(i / count);
    return {
      x: offset + x * (boxSize + spacing),
      y: offset + y * (boxSize + spacing),
    };
  });

  return (
   <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      {squares.map(({ x, y }, i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={boxSize}
          height={boxSize}
          rx={radius}
          ry={radius}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          shapeRendering="geometricPrecision"
          style={{
            transition: 'all 0.2s ease',
          }}
        />
      ))}
    </svg>
  );
};

export default GridIcon;
