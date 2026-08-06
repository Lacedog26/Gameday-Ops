import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
};

export default function FireIcon({ size = 32 }: Props) {
  const s = size / 32;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {/* Outer flame — orange/red */}
      <Path
        d="M16 2C16 2 8 10 8 18c0 4.42 3.58 8 8 8s8-3.58 8-8C24 10 16 2 16 2z"
        fill="#FF6B35"
      />
      {/* Mid flame — warm orange */}
      <Path
        d="M16 8C16 8 11 14 11 19c0 2.76 2.24 5 5 5s5-2.24 5-5C21 14 16 8 16 8z"
        fill="#FFB347"
      />
      {/* Inner flame — yellow */}
      <Path
        d="M16 14C16 14 13.5 17 13.5 20c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5C18.5 17 16 14 16 14z"
        fill="#F5C842"
      />
      {/* Hot core highlight */}
      <Path
        d="M16 18c0 0-1 1.2-1 2.2c0 .55.45 1 1 1s1-.45 1-1C17 19.2 16 18 16 18z"
        fill="#FFF3C4"
      />
    </Svg>
  );
}
