import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function TargetIcon({ size = 22, color = '#FF6B6B' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={6} stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={2} fill={color} />
    </Svg>
  );
}
