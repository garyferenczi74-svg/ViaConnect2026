import React from 'react';
import Svg, { Path, Circle, Ellipse, Defs, LinearGradient, Stop, G, Line } from 'react-native-svg';

interface ViaConnectLogoProps {
  size?: number;
}

export default function ViaConnectLogo({ size = 120 }: ViaConnectLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Defs>
        <LinearGradient id="tealGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2A6B7C" />
          <Stop offset="1" stopColor="#224852" />
        </LinearGradient>
        <LinearGradient id="copperGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8B4533" />
          <Stop offset="1" stopColor="#6B3325" />
        </LinearGradient>
      </Defs>

      {/* Outer circle ring */}
      <Circle cx="100" cy="100" r="90" stroke="#224852" strokeWidth="2.5" fill="none" />

      {/* Connection node — top */}
      <Circle cx="100" cy="10" r="5" stroke="#224852" strokeWidth="2" fill="none" />
      {/* Connection node — bottom */}
      <Circle cx="100" cy="190" r="5" stroke="#224852" strokeWidth="2" fill="none" />
      {/* Connection node — left */}
      <Circle cx="10" cy="100" r="5" stroke="#224852" strokeWidth="2" fill="none" />
      {/* Connection node — right */}
      <Circle cx="190" cy="100" r="5" stroke="#224852" strokeWidth="2" fill="none" />

      {/* Human silhouette */}
      <G fill="#7B3B2D">
        {/* Head */}
        <Ellipse cx="100" cy="38" rx="12" ry="14" />

        {/* Neck */}
        <Path d="M95 52 L105 52 L105 58 L95 58 Z" />

        {/* Torso */}
        <Path
          d="M80 58 C80 58 72 62 68 68 L68 72 L78 70 L76 120 L86 125 L86 70 L95 65
             L105 65 L114 70 L114 125 L124 120 L122 70 L132 72 L132 68 C128 62 120 58 120 58 Z"
        />

        {/* Left arm */}
        <Path
          d="M68 68 C62 78 56 92 52 102 C50 108 48 114 50 116
             C52 118 54 116 56 112 L66 88 L68 72 Z"
        />

        {/* Right arm */}
        <Path
          d="M132 68 C138 78 144 92 148 102 C150 108 152 114 150 116
             C148 118 146 116 144 112 L134 88 L132 72 Z"
        />

        {/* Left hand fingers */}
        <Path
          d="M50 116 L47 122 M50 116 L49 123 M50 116 L51 122 M50 116 L53 121"
          stroke="#7B3B2D"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Right hand fingers */}
        <Path
          d="M150 116 L153 122 M150 116 L151 123 M150 116 L149 122 M150 116 L147 121"
          stroke="#7B3B2D"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Left leg */}
        <Path d="M86 125 L82 158 L80 170 L86 170 L90 145 L95 130 Z" />

        {/* Right leg */}
        <Path d="M114 125 L118 158 L120 170 L114 170 L110 145 L105 130 Z" />
      </G>

      {/* DNA helix — white cutouts down the torso center */}
      <G stroke="white" strokeWidth="2" strokeLinecap="round" fill="none">
        {/* Left helix strand */}
        <Path d="M92 60 C96 68 96 74 92 80 C88 86 88 92 92 98 C96 104 96 110 92 116 C88 122 88 128 92 134 C96 140 96 146 92 152 C88 158 88 164 92 170" />

        {/* Right helix strand */}
        <Path d="M108 60 C104 68 104 74 108 80 C112 86 112 92 108 98 C104 104 104 110 108 116 C112 122 112 128 108 134 C104 140 104 146 108 152 C112 158 112 164 108 170" />
      </G>

      {/* Helix cross-rungs */}
      <G stroke="white" strokeWidth="1.5" strokeLinecap="round">
        <Line x1="93" y1="65" x2="107" y2="65" />
        <Line x1="91" y1="73" x2="109" y2="73" />
        <Line x1="93" y1="80" x2="107" y2="80" />
        <Line x1="91" y1="88" x2="109" y2="88" />
        <Line x1="93" y1="95" x2="107" y2="95" />
        <Line x1="91" y1="103" x2="109" y2="103" />
        <Line x1="93" y1="110" x2="107" y2="110" />
        <Line x1="91" y1="118" x2="109" y2="118" />
        <Line x1="93" y1="125" x2="107" y2="125" />
        <Line x1="91" y1="133" x2="109" y2="133" />
        <Line x1="93" y1="140" x2="107" y2="140" />
        <Line x1="91" y1="148" x2="109" y2="148" />
        <Line x1="93" y1="155" x2="107" y2="155" />
        <Line x1="91" y1="163" x2="109" y2="163" />
      </G>

      {/* Helix node dots */}
      <G fill="white">
        <Circle cx="92" cy="60" r="2" />
        <Circle cx="108" cy="60" r="2" />
        <Circle cx="92" cy="80" r="2" />
        <Circle cx="108" cy="80" r="2" />
        <Circle cx="92" cy="98" r="2" />
        <Circle cx="108" cy="98" r="2" />
        <Circle cx="92" cy="116" r="2" />
        <Circle cx="108" cy="116" r="2" />
        <Circle cx="92" cy="134" r="2" />
        <Circle cx="108" cy="134" r="2" />
        <Circle cx="92" cy="152" r="2" />
        <Circle cx="108" cy="152" r="2" />
        <Circle cx="92" cy="170" r="2" />
        <Circle cx="108" cy="170" r="2" />
      </G>
    </Svg>
  );
}
