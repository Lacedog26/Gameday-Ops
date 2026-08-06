import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

/**
 * Three connected nodes — the standard "share" mark (Material/Lucide).
 * Mirrors the web ShareIcon exactly so the Done screen looks identical
 * across both platforms.
 */
export default function ShareIcon({ size = 18, color = '#0C0C0C' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={18} cy={5} r={3} stroke={color} strokeWidth={2.4} />
      <Circle cx={6} cy={12} r={3} stroke={color} strokeWidth={2.4} />
      <Circle cx={18} cy={19} r={3} stroke={color} strokeWidth={2.4} />
      <Line
        x1={8.59}
        y1={13.51}
        x2={15.42}
        y2={17.49}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Line
        x1={15.41}
        y1={6.51}
        x2={8.59}
        y2={10.49}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
