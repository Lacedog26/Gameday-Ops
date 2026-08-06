import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function StarIcon({ size = 32, color = '#F5C842' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 2l4.12 8.35L29 11.75l-6.5 6.34L24.24 27 16 22.6 7.76 27l1.74-8.91L3 11.75l8.88-1.4z"
        fill={color}
      />
      <Path
        d="M16 6l2.75 5.57 6.15.9-4.45 4.33 1.05 6.1L16 20l-5.5 2.9 1.05-6.1-4.45-4.33 6.15-.9z"
        fill="rgba(255,255,255,0.15)"
      />
    </Svg>
  );
}
