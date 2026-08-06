import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function LightbulbIcon({ size = 20, color = '#F5C842' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bulb */}
      <Path
        d="M12 2a7 7 0 00-4 12.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26A7 7 0 0012 2z"
        fill={color}
        opacity={0.25}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Base lines */}
      <Path
        d="M9 20h6M10 22h4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Filament */}
      <Path
        d="M12 8v4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.7}
      />
    </Svg>
  );
}
