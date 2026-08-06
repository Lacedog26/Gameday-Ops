import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function ChurchIcon({ size = 28, color = '#C3B1E1' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Cross */}
      <Path
        d="M12 2v4M10 4h4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Roof */}
      <Path
        d="M4 14l8-8 8 8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Building */}
      <Rect
        x={5}
        y={14}
        width={14}
        height={8}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Door */}
      <Path
        d="M10 22v-4a2 2 0 014 0v4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
