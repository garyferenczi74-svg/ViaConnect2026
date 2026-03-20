import React from 'react';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface ViaConnectLogoProps {
  size?: number;
}

export default function ViaConnectLogo({ size = 120 }: ViaConnectLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Defs>
        <LinearGradient id="tealGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2A6B7C" />
          <Stop offset="1" stopColor="#224852" />
        </LinearGradient>
        <LinearGradient id="copperGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#D4782A" />
          <Stop offset="1" stopColor="#B75F19" />
        </LinearGradient>
        <LinearGradient id="helixGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B75F19" />
          <Stop offset="0.5" stopColor="#D4782A" />
          <Stop offset="1" stopColor="#B75F19" />
        </LinearGradient>
      </Defs>

      {/* Outer circle */}
      <Circle cx="60" cy="60" r="56" stroke="url(#tealGrad)" strokeWidth="2.5" opacity="0.6" />

      {/* Inner circle */}
      <Circle cx="60" cy="60" r="44" stroke="url(#tealGrad)" strokeWidth="1.5" opacity="0.3" />

      {/* Stylized "V" mark */}
      <Path
        d="M36 32L60 88L84 32"
        stroke="url(#tealGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* DNA helix strand left */}
      <Path
        d="M48 42C52 50 52 58 48 66C44 74 44 82 48 88"
        stroke="url(#helixGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* DNA helix strand right */}
      <Path
        d="M72 42C68 50 68 58 72 66C76 74 76 82 72 88"
        stroke="url(#helixGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Helix cross-bars */}
      <Path d="M50 48L70 48" stroke="url(#copperGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <Path d="M47 58L73 58" stroke="url(#copperGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <Path d="M47 68L73 68" stroke="url(#copperGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <Path d="M50 78L70 78" stroke="url(#copperGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

      {/* Accent dot at apex */}
      <Circle cx="60" cy="88" r="3" fill="url(#copperGrad)" />
    </Svg>
  );
}
