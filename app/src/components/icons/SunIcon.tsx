import React from 'react';
import Svg, { Circle, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// ☀️ — Apple-style sun: large bright disc + 8 thick rounded-rect rays
// 4 long cardinal rays + 4 shorter diagonal rays
export default function SunIcon({ size = 64, color = '#F5C842' }: Props) {
  const c = 32; // center of 64x64 viewBox

  // Ray config: [angle, width, innerGap, outerEnd]
  const rays: [number, number, number, number][] = [
    // Cardinal rays — longer, slightly wider
    [0,   4.5, 17, 30],   // top
    [90,  4.5, 17, 30],   // right
    [180, 4.5, 17, 30],   // bottom
    [270, 4.5, 17, 30],   // left
    // Diagonal rays — shorter, slightly narrower
    [45,  3.8, 17, 26],
    [135, 3.8, 17, 26],
    [225, 3.8, 17, 26],
    [315, 3.8, 17, 26],
  ];

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id="sun_g" cx="50%" cy="48%" r="50%">
          <Stop offset="0" stopColor="#FFF176" />
          <Stop offset="0.55" stopColor={color} />
          <Stop offset="1" stopColor="#F0B830" />
        </RadialGradient>
      </Defs>

      {/* 8 rounded-rect rays */}
      {rays.map(([angle, w, inner, outer], i) => {
        const halfW = w / 2;
        const length = outer - inner;
        return (
          <Rect
            key={i}
            x={c - halfW}
            y={c - outer}
            width={w}
            height={length}
            rx={halfW}
            ry={halfW}
            fill={color}
            rotation={angle}
            origin={`${c}, ${c}`}
          />
        );
      })}

      {/* Main disc */}
      <Circle cx={c} cy={c} r="13" fill="url(#sun_g)" />

      {/* Specular highlight */}
      <Circle cx="28.5" cy="28.5" r="4.5" fill="rgba(255,255,255,0.30)" />
      <Circle cx="30" cy="30" r="2" fill="rgba(255,255,255,0.18)" />
    </Svg>
  );
}
