import React from 'react';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, RadialGradient, Stop, ClipPath } from 'react-native-svg';

type Props = {
  size?: number;
};

// 🌅 Apple emoji: warm orange sky, large half-sun on flat horizon, dark blue water, sun reflection
export default function SunriseIcon({ size = 80 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        {/* Sky — all warm tones, no blue. Deep red-orange top → bright gold at horizon */}
        <LinearGradient id="sr_sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C0392B" />
          <Stop offset="0.25" stopColor="#E05A33" />
          <Stop offset="0.50" stopColor="#E8853A" />
          <Stop offset="0.75" stopColor="#F0A840" />
          <Stop offset="1" stopColor="#F5D060" />
        </LinearGradient>
        {/* Water — deep calm blue-grey */}
        <LinearGradient id="sr_water" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2B6C99" />
          <Stop offset="0.5" stopColor="#1F5578" />
          <Stop offset="1" stopColor="#173F5A" />
        </LinearGradient>
        {/* Sun — bright warm center */}
        <RadialGradient id="sr_sun" cx="50%" cy="70%" r="55%">
          <Stop offset="0" stopColor="#FFFDE7" />
          <Stop offset="0.35" stopColor="#FFE082" />
          <Stop offset="0.7" stopColor="#FFCA28" />
          <Stop offset="1" stopColor="#F5B020" />
        </RadialGradient>
        {/* Big warm glow behind sun */}
        <RadialGradient id="sr_glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFE082" stopOpacity="0.7" />
          <Stop offset="0.5" stopColor="#F5C040" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#F5C040" stopOpacity="0" />
        </RadialGradient>
        {/* Clip to top half for sun */}
        <ClipPath id="sr_clip">
          <Rect x="0" y="0" width="80" height="42" />
        </ClipPath>
      </Defs>

      {/* Sky fill — rounded rect top half */}
      <Path
        d="M 12 4 L 68 4 Q 76 4 76 12 L 76 42 L 4 42 L 4 12 Q 4 4 12 4 Z"
        fill="url(#sr_sky)"
      />

      {/* Water fill — rounded rect bottom half */}
      <Path
        d="M 4 42 L 76 42 L 76 68 Q 76 76 68 76 L 12 76 Q 4 76 4 68 Z"
        fill="url(#sr_water)"
      />

      {/* Sun glow — large warm halo */}
      <Circle cx="40" cy="42" r="28" fill="url(#sr_glow)" clipPath="url(#sr_clip)" />

      {/* Sun disc — large, sitting on horizon, clipped to upper half */}
      <Circle cx="40" cy="42" r="16" fill="url(#sr_sun)" clipPath="url(#sr_clip)" />

      {/* Thin bright horizon line */}
      <Rect x="4" y="41" width="72" height="2" fill="#FFE082" opacity="0.6" />

      {/* Sun reflection on water — bright vertical streak */}
      <Rect x="36" y="42" width="8" height="34" rx="4" fill="#F5C842" opacity="0.22" />
      <Rect x="37.5" y="42" width="5" height="22" rx="2.5" fill="#FFE082" opacity="0.18" />
      <Rect x="38.5" y="42" width="3" height="14" rx="1.5" fill="#FFFDE7" opacity="0.15" />

      {/* Water ripples — subtle horizontal lines */}
      <Rect x="22" y="50" width="14" height="1.4" rx="0.7" fill="#5AACCF" opacity="0.22" />
      <Rect x="46" y="52" width="18" height="1.3" rx="0.65" fill="#5AACCF" opacity="0.18" />
      <Rect x="14" y="56" width="11" height="1.2" rx="0.6" fill="#5AACCF" opacity="0.15" />
      <Rect x="50" y="59" width="14" height="1.2" rx="0.6" fill="#5AACCF" opacity="0.13" />
      <Rect x="28" y="63" width="20" height="1.1" rx="0.55" fill="#5AACCF" opacity="0.10" />
      <Rect x="16" y="68" width="12" height="1" rx="0.5" fill="#5AACCF" opacity="0.08" />
      <Rect x="52" y="67" width="14" height="1" rx="0.5" fill="#5AACCF" opacity="0.08" />
    </Svg>
  );
}
