import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function GroupsIcon({ size = 26, color = '#C3B1E1' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Center person */}
      <Circle cx={12} cy={7} r={3} stroke={color} strokeWidth={2} />
      <Path
        d="M7 21v-1a5 5 0 0110 0v1"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Left person */}
      <Circle cx={5} cy={9} r={2.25} stroke={color} strokeWidth={1.5} opacity={0.7} />
      <Path
        d="M1 21v-.5a4 4 0 014.5-4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.7}
      />
      {/* Right person */}
      <Circle cx={19} cy={9} r={2.25} stroke={color} strokeWidth={1.5} opacity={0.7} />
      <Path
        d="M23 21v-.5a4 4 0 00-4.5-4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.7}
      />
    </Svg>
  );
}
