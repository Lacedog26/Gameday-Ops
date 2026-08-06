import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function ClipboardIcon({ size = 20, color = '#F5C842' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={5}
        y={4}
        width={14}
        height={17}
        rx={2}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M9 2h6a1 1 0 011 1v1a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M9 12h6M9 16h4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
