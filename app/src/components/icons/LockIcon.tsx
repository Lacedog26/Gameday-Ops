import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function LockIcon({ size = 16, color = '#A8E6CF' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={5}
        y={11}
        width={14}
        height={10}
        rx={2}
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M8 11V7a4 4 0 018 0v4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
