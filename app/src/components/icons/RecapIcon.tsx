import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function RecapIcon({ size = 26, color = '#FFB347' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Book cover */}
      <Path
        d="M4 4.5A2.5 2.5 0 016.5 2H20v16H6.5A2.5 2.5 0 004 20.5v-16z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Book spine bottom */}
      <Path
        d="M4 18h16v2a2 2 0 01-2 2H6.5A2.5 2.5 0 014 19.5V18z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Page lines */}
      <Path
        d="M8 7h8M8 11h5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
