import React from 'react';
import Svg, { Circle, Path, G } from 'react-native-svg';

type Props = {
  size?: number;
};

export default function MedalIcon({ size = 32 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Ribbon left */}
      <Path d="M11 4l-3 12h4l2-8" fill="#5C6BC0" opacity={0.8} />
      {/* Ribbon right */}
      <Path d="M21 4l3 12h-4l-2-8" fill="#7986CB" opacity={0.8} />
      {/* Medal body */}
      <Circle cx={16} cy={20} r={8} fill="#FFB347" />
      <Circle cx={16} cy={20} r={6} fill="#F5C842" />
      {/* Star */}
      <Path
        d="M16 15l1.5 3.1 3.4.5-2.5 2.4.6 3.4L16 22.8l-3 1.6.6-3.4-2.5-2.4 3.4-.5z"
        fill="#FFB347"
      />
      {/* Highlight */}
      <Circle cx={13.5} cy={17.5} r={1.5} fill="rgba(255,255,255,0.25)" />
    </Svg>
  );
}
