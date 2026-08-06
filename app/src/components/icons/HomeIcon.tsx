import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function HomeIcon({ size = 26, color = '#F5C842' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Roof */}
      <Path
        d="M3 10.5L12 3l9 7.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* House body */}
      <Path
        d="M5 9.5V19a1 1 0 001 1h12a1 1 0 001-1V9.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Door */}
      <Path
        d="M9.5 20v-5a1 1 0 011-1h3a1 1 0 011 1v5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
