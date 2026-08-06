import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
};

export default function SeedlingIcon({ size = 32 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Stem */}
      <Path
        d="M16 28V16"
        stroke="#6BCB77"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Right leaf */}
      <Path
        d="M16 20c4-2 7-6 8-12c-6 1-10 4-12 8"
        fill="#A8E6CF"
        stroke="#6BCB77"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Left leaf */}
      <Path
        d="M16 16c-3-1.5-6-2-9-1c1 5 4 7 7 8"
        fill="#C8F7DC"
        stroke="#6BCB77"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Leaf vein right */}
      <Path
        d="M17 19c2-1.5 4-4 5-8"
        stroke="#6BCB77"
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.5}
      />
    </Svg>
  );
}
