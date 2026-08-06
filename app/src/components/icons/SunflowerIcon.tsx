import React from 'react';
import Svg, { Circle, Ellipse, Path, G, Defs, RadialGradient, Stop } from 'react-native-svg';

type Props = {
  size?: number;
};

// Matches 🌻 emoji: yellow petals, large brown center with seed pattern, green stem + leaf
export default function SunflowerIcon({ size = 64 }: Props) {
  const cx = 32;
  const cy = 26;
  const petalCount = 12;
  const petalDist = 14;
  const petalW = 5.5;
  const petalH = 10;
  const coreR = 8.5;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id="sf_center" cx="50%" cy="45%" r="50%">
          <Stop offset="0" stopColor="#8B5E3C" />
          <Stop offset="0.5" stopColor="#6B3A1F" />
          <Stop offset="1" stopColor="#4A2410" />
        </RadialGradient>
      </Defs>

      {/* Stem */}
      <Path
        d="M 32 35 Q 33 45 31 58"
        stroke="#5B8C3E"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Leaf right */}
      <Path
        d="M 33 46 Q 44 42 46 38 Q 42 44 34 47"
        fill="#6BAF4B"
      />
      {/* Leaf left */}
      <Path
        d="M 31 50 Q 20 48 18 44 Q 22 49 30 51"
        fill="#7BC55A"
      />

      {/* Outer petals — orange/golden */}
      <G>
        {Array.from({ length: petalCount }).map((_, i) => {
          const angle = (i * 360) / petalCount;
          const rad = (angle * Math.PI) / 180;
          const px = cx + petalDist * Math.cos(rad);
          const py = cy + petalDist * Math.sin(rad);
          return (
            <Ellipse
              key={`o-${i}`}
              cx={px}
              cy={py}
              rx={petalW}
              ry={petalH}
              fill={i % 3 === 0 ? '#F5A623' : i % 3 === 1 ? '#FFB833' : '#F0960A'}
              rotation={angle + 90}
              origin={`${px}, ${py}`}
            />
          );
        })}
      </G>

      {/* Inner petals — bright yellow, offset */}
      <G>
        {Array.from({ length: petalCount }).map((_, i) => {
          const angle = (i * 360) / petalCount + 15;
          const rad = (angle * Math.PI) / 180;
          const dist = petalDist * 0.72;
          const px = cx + dist * Math.cos(rad);
          const py = cy + dist * Math.sin(rad);
          return (
            <Ellipse
              key={`i-${i}`}
              cx={px}
              cy={py}
              rx={petalW * 0.8}
              ry={petalH * 0.7}
              fill={i % 2 === 0 ? '#F5C842' : '#FFDD44'}
              rotation={angle + 90}
              origin={`${px}, ${py}`}
            />
          );
        })}
      </G>

      {/* Center disc — dark brown gradient */}
      <Circle cx={cx} cy={cy} r={coreR} fill="url(#sf_center)" />

      {/* Seed pattern — spiral dots */}
      {[
        [0, -3], [2.5, -1.5], [1, 2], [-2, 1.5], [-2.5, -1],
        [0, 0.5], [3, 2], [-1, -2.5], [-3, 0.5], [1.5, -0.5],
        [2, 3.5], [-2, 3], [-3.5, -2], [3.5, 0], [0, 3],
      ].map(([dx, dy], i) => (
        <Circle
          key={`s-${i}`}
          cx={cx + dx}
          cy={cy + dy}
          r={0.9}
          fill={i % 3 === 0 ? '#8B5E3C' : '#A0703E'}
          opacity={0.7}
        />
      ))}

      {/* Center sheen */}
      <Circle cx={cx - 2.5} cy={cy - 3} r={2.5} fill="rgba(255,255,255,0.08)" />
    </Svg>
  );
}
