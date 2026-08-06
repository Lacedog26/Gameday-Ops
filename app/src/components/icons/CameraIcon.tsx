import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export default function CameraIcon({ size = 20, color = '#F5C842' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 4h-5L7.5 6H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-3.5L14.5 4z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
