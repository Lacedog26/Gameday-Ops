import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function SparkleIcon({ size = 32, color = '#C3B1E1' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Main 4-point star */}
      <Path
        d="M16 2C16 2 18 11 18 14c0 1.1.9 2 2 2 3 0 12 0 12 0s-9 2-12 2c-1.1 0-2 .9-2 2 0 3 0 12 0 12s-2-9-2-12c0-1.1-.9-2-2-2-3 0-12 0-12 0s9-2 12-2c1.1 0 2-.9 2-2 0-3 0-12 0-12z"
        fill={color}
      />
      {/* Small accent sparkle */}
      <Path
        d="M25 3c0 0 .5 2 .5 2.5s.5.5 1 .5 2.5.5 2.5.5-2 .5-2.5.5-.5.5-.5 1 -.5 2.5-.5 2.5-.5-2-.5-2.5-.5-.5-1-.5-2.5-.5-2.5-.5 2-.5 2.5-.5.5-.5.5-1 .5-2.5.5-2.5z"
        fill={color}
        opacity={0.6}
      />
    </Svg>
  );
}
