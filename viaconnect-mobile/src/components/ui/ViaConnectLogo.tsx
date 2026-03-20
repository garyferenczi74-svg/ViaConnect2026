/**
 * ViaConnect GeneX360 — Brand Logo Component
 *
 * SVG logo: human silhouette with DNA helix overlay inside a
 * circular ring with 4 connection nodes + "ViaConnect" wordmark.
 * Recreated from brand assets for native rendering via react-native-svg.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface ViaConnectLogoProps {
  /** Width of the logo (height auto-scales) */
  size?: number;
  /** Show the wordmark text below the icon */
  showWordmark?: boolean;
  className?: string;
}

export function ViaConnectLogo({
  size = 200,
  showWordmark = true,
  className,
}: ViaConnectLogoProps) {
  const viewBoxHeight = showWordmark ? 520 : 440;

  return (
    <View className={className} style={{ width: size, height: size * (viewBoxHeight / 480) }}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 480 ${viewBoxHeight}`}
        fill="none"
      >
        <Defs>
          {/* Gradient for "Via" portion of wordmark */}
          <LinearGradient id="viaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8B4533" />
            <Stop offset="1" stopColor="#6B3425" />
          </LinearGradient>
          {/* Gradient for "Connect" portion of wordmark */}
          <LinearGradient id="connectGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#5A7A80" />
            <Stop offset="1" stopColor="#224852" />
          </LinearGradient>
          {/* Body fill */}
          <LinearGradient id="bodyGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#8B4533" />
            <Stop offset="0.8" stopColor="#7A3D2E" />
            <Stop offset="1" stopColor="#6B3425" />
          </LinearGradient>
        </Defs>

        {/* ── Outer Circle Ring ─────────────────────────────── */}
        <Circle
          cx="240"
          cy="220"
          r="195"
          stroke="#2D5F68"
          strokeWidth="2.5"
          fill="none"
        />

        {/* ── 4 Connection Nodes ───────────────────────────── */}
        {/* Top */}
        <Circle cx="240" cy="25" r="9" stroke="#2D5F68" strokeWidth="2" fill="none" />
        <Circle cx="240" cy="25" r="3.5" fill="#2D5F68" />
        {/* Bottom */}
        <Circle cx="240" cy="415" r="9" stroke="#2D5F68" strokeWidth="2" fill="none" />
        <Circle cx="240" cy="415" r="3.5" fill="#2D5F68" />
        {/* Left */}
        <Circle cx="52" cy="240" r="9" stroke="#2D5F68" strokeWidth="2" fill="none" />
        <Circle cx="52" cy="240" r="3.5" fill="#2D5F68" />
        {/* Right */}
        <Circle cx="428" cy="240" r="9" stroke="#2D5F68" strokeWidth="2" fill="none" />
        <Circle cx="428" cy="240" r="3.5" fill="#2D5F68" />

        {/* ── Human Silhouette ─────────────────────────────── */}
        <G transform="translate(240, 100)">
          {/* Head */}
          <Ellipse cx="0" cy="0" rx="22" ry="26" fill="url(#bodyGrad)" />

          {/* Neck */}
          <Path d="M-8 24 L8 24 L10 42 L-10 42 Z" fill="url(#bodyGrad)" />

          {/* Shoulders & torso */}
          <Path
            d="M-10 40 Q-60 48 -75 75 Q-80 90 -68 100 L-45 95 Q-30 80 -22 65 L-22 180 Q-20 200 -15 220 L15 220 Q20 200 22 180 L22 65 Q30 80 45 95 L68 100 Q80 90 75 75 Q60 48 10 40 Z"
            fill="url(#bodyGrad)"
          />

          {/* Left arm */}
          <Path
            d="M-68 100 Q-75 130 -72 155 Q-70 175 -62 190 Q-55 205 -48 215 Q-42 225 -38 230 L-32 225 Q-40 210 -48 195 Q-55 180 -58 160 Q-60 140 -55 120"
            fill="url(#bodyGrad)"
          />

          {/* Right arm */}
          <Path
            d="M68 100 Q75 130 72 155 Q70 175 62 190 Q55 205 48 215 Q42 225 38 230 L32 225 Q40 210 48 195 Q55 180 58 160 Q60 140 55 120"
            fill="url(#bodyGrad)"
          />

          {/* Legs (lower) */}
          <Path
            d="M-15 220 Q-18 260 -20 290 Q-18 300 -12 305 L-5 290 Q-5 260 -3 230"
            fill="url(#bodyGrad)"
          />
          <Path
            d="M15 220 Q18 260 20 290 Q18 300 12 305 L5 290 Q5 260 3 230"
            fill="url(#bodyGrad)"
          />
        </G>

        {/* ── DNA Helix (white cutouts over body) ──────────── */}
        <G transform="translate(240, 145)" opacity="0.95">
          {/* Helix rungs — horizontal bars */}
          {[0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180, 198, 216, 234, 252].map(
            (y, i) => {
              const wave = Math.sin((i / 14) * Math.PI * 2.8) * 14;
              const w = 10 + Math.abs(Math.cos((i / 14) * Math.PI * 2)) * 8;
              return (
                <G key={i}>
                  {/* Left strand node */}
                  <Circle
                    cx={-wave - w}
                    cy={y}
                    r={3}
                    fill="white"
                  />
                  {/* Rung */}
                  <Path
                    d={`M${-wave - w} ${y} L${-wave + w} ${y}`}
                    stroke="white"
                    strokeWidth="1.5"
                    opacity="0.7"
                  />
                  {/* Right strand node */}
                  <Circle
                    cx={-wave + w}
                    cy={y}
                    r={3}
                    fill="white"
                  />
                </G>
              );
            },
          )}
        </G>

        {/* ── Wordmark ─────────────────────────────────────── */}
        {showWordmark && (
          <G transform="translate(240, 480)">
            <SvgText
              x="-98"
              y="0"
              fontSize="62"
              fontWeight="bold"
              fontFamily="Inter, system-ui, sans-serif"
              fill="url(#viaGrad)"
              textAnchor="start"
            >
              Via
            </SvgText>
            <SvgText
              x="10"
              y="0"
              fontSize="62"
              fontWeight="bold"
              fontFamily="Inter, system-ui, sans-serif"
              fill="url(#connectGrad)"
              textAnchor="start"
            >
              Connect
            </SvgText>
          </G>
        )}
      </Svg>
    </View>
  );
}
