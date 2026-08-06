import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function TimerIcon({ size = 22, color = '#FFB347' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13} r={9} stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 9v4l3 2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 2h4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
