import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle, Line, G, Ellipse, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(View);

type Props = {
  size?: number;
  onComplete?: () => void;
};

// ── Sun SVG ──
function SunSvg({ size }: { size: number }) {
  const center = size / 2;
  const coreRadius = size * 0.2;
  const rayInner = size * 0.32;
  const rayOuter = size * 0.46;
  const rayCount = 12;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G>
        {Array.from({ length: rayCount }).map((_, i) => {
          const angle = (i * 360) / rayCount - 90;
          const rad = (angle * Math.PI) / 180;
          return (
            <Line
              key={i}
              x1={center + rayInner * Math.cos(rad)}
              y1={center + rayInner * Math.sin(rad)}
              x2={center + rayOuter * Math.cos(rad)}
              y2={center + rayOuter * Math.sin(rad)}
              stroke="#F5C842"
              strokeWidth={size * 0.04}
              strokeLinecap="round"
              opacity={i % 2 === 0 ? 1 : 0.6}
            />
          );
        })}
      </G>
      <Circle cx={center} cy={center} r={coreRadius} fill="#F5C842" />
      <Circle
        cx={center - coreRadius * 0.25}
        cy={center - coreRadius * 0.25}
        r={coreRadius * 0.35}
        fill="rgba(255,255,255,0.3)"
      />
    </Svg>
  );
}

// ── Sunflower SVG ──
function SunflowerSvg({ size }: { size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const petalCount = 14;
  const petalW = size * 0.11;
  const petalH = size * 0.22;
  const petalDist = size * 0.24;
  const coreR = size * 0.17;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G>
        {Array.from({ length: petalCount }).map((_, i) => {
          const angle = (i * 360) / petalCount;
          const rad = (angle * Math.PI) / 180;
          return (
            <Ellipse
              key={`o-${i}`}
              cx={cx + petalDist * Math.cos(rad)}
              cy={cy + petalDist * Math.sin(rad)}
              rx={petalW}
              ry={petalH}
              fill={i % 2 === 0 ? '#FFB347' : '#F5A623'}
              rotation={angle + 90}
              origin={`${cx + petalDist * Math.cos(rad)}, ${cy + petalDist * Math.sin(rad)}`}
            />
          );
        })}
      </G>
      <G>
        {Array.from({ length: petalCount }).map((_, i) => {
          const angle = (i * 360) / petalCount + 360 / petalCount / 2;
          const rad = (angle * Math.PI) / 180;
          const dist = petalDist * 0.78;
          return (
            <Ellipse
              key={`i-${i}`}
              cx={cx + dist * Math.cos(rad)}
              cy={cy + dist * Math.sin(rad)}
              rx={petalW * 0.85}
              ry={petalH * 0.75}
              fill="#F5C842"
              rotation={angle + 90}
              origin={`${cx + dist * Math.cos(rad)}, ${cy + dist * Math.sin(rad)}`}
            />
          );
        })}
      </G>
      <Circle cx={cx} cy={cy} r={coreR} fill="#5D3A1A" />
      <Circle cx={cx - coreR * 0.3} cy={cy - coreR * 0.15} r={coreR * 0.08} fill="#7A4E2A" />
      <Circle cx={cx + coreR * 0.2} cy={cy - coreR * 0.3} r={coreR * 0.07} fill="#7A4E2A" />
      <Circle cx={cx + coreR * 0.35} cy={cy + coreR * 0.15} r={coreR * 0.08} fill="#7A4E2A" />
      <Circle cx={cx - coreR * 0.1} cy={cy + coreR * 0.35} r={coreR * 0.07} fill="#7A4E2A" />
      <Circle cx={cx + coreR * 0.05} cy={cy + coreR * 0.05} r={coreR * 0.06} fill="#7A4E2A" />
    </Svg>
  );
}

// ── Shooting Rays (like website @keyframes rayShoot) ──
function ShootingRay({ angle, delay, size }: { angle: number; delay: number; size: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const rayStyle = useAnimatedStyle(() => {
    const scaleY = interpolate(progress.value, [0, 0.4, 1], [0, 1, 1]);
    const opacity = interpolate(progress.value, [0, 0.3, 0.6, 1], [0, 1, 0.8, 0]);
    const translateY = interpolate(progress.value, [0, 1], [0, -40]);
    return {
      opacity,
      transform: [
        { rotate: `${angle}deg` },
        { scaleY },
        { translateY },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 4,
          height: 40,
          bottom: '50%',
          left: size / 2 - 2,
          borderRadius: 4,
          backgroundColor: '#F5C842',
          transformOrigin: 'bottom center',
        },
        rayStyle,
      ]}
    />
  );
}

export default function AnimatedBloom({ size = 140, onComplete }: Props) {
  const [phase, setPhase] = useState<'sun' | 'flower'>('sun');
  const [showRays, setShowRays] = useState(false);

  // Main icon scale
  const scale = useSharedValue(1);
  // Opacity fade in
  const opacity = useSharedValue(0);
  // Glow ring
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    // All setTimeouts get tracked so unmount can cancel them — without
    // this the trailing callbacks (especially onComplete at 2.6s)
    // continued firing on a popped/unmounted component, which on the
    // new arch could leave reanimated trying to apply withRepeat
    // updates to a freed view → native crash.
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    const safeTimeout = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        if (cancelled) return;
        try { fn(); } catch (err) { console.warn('[AnimatedBloom timeout]', err); }
      }, ms);
      timeouts.push(id);
    };

    // Phase 1: Fade in
    opacity.value = withTiming(1, { duration: 400 });

    // Phase 2: Scale up sun (0.4s)
    scale.value = withDelay(
      400,
      withSpring(1.3, { damping: 10, stiffness: 100 })
    );

    // Phase 3: Show shooting rays (1.0s)
    safeTimeout(() => setShowRays(true), 1000);

    // Phase 4: Transform to sunflower (1.4s)
    safeTimeout(() => {
      setPhase('flower');
      scale.value = withSpring(1.4, { damping: 8, stiffness: 90 });
      // Start glow pulse
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.75, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        true
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 1000 }),
          withTiming(1.3, { duration: 1000 })
        ),
        -1,
        true
      );
    }, 1400);

    // Phase 5: Settle scale (1.75s)
    safeTimeout(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    }, 1750);

    // Phase 6: Complete (2.6s)
    if (onComplete) {
      safeTimeout(() => onComplete(), 2600);
    }

    return () => {
      cancelled = true;
      for (const id of timeouts) clearTimeout(id);
    };
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const bloomSize = size;
  const rayAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <View style={{ width: bloomSize, height: bloomSize, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow ring (appears after sunflower) */}
      {phase === 'flower' && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: bloomSize * 1.4,
              height: bloomSize * 1.4,
              borderRadius: bloomSize * 0.7,
              backgroundColor: 'rgba(245, 200, 66, 0.15)',
            },
            glowStyle,
          ]}
        />
      )}

      {/* Shooting rays */}
      {showRays &&
        rayAngles.map((angle, i) => (
          <ShootingRay
            key={i}
            angle={angle}
            delay={i * 50}
            size={bloomSize}
          />
        ))}

      {/* Main icon */}
      <Animated.View style={iconStyle}>
        {phase === 'sun' ? (
          <SunSvg size={bloomSize * 0.7} />
        ) : (
          <SunflowerSvg size={bloomSize * 0.7} />
        )}
      </Animated.View>
    </View>
  );
}
