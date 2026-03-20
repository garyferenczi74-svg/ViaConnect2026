import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polygon, Circle as SvgCircle, Line, Text as SvgText } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';

// ── Types ────────────────────────────────────────────────────────────────────

export type ConstitutionSystem = 'ayurvedic' | 'tcm';

export interface AyurvedicScores {
  vata: number; // 0-100
  pitta: number;
  kapha: number;
}

export interface TCMScores {
  wood: number; // 0-100
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

export interface ConstitutionalTypeProps {
  system: ConstitutionSystem;
  scores: AyurvedicScores | TCMScores;
  isLoading?: boolean;
}

// ── Radar Chart ──────────────────────────────────────────────────────────────

function RadarChart({
  labels,
  values,
  size = 250,
}: {
  labels: string[];
  values: number[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;
  const levels = 4;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / labels.length - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const gridPoints = (level: number) =>
    labels
      .map((_, i) => {
        const p = getPoint(i, (level / levels) * 100);
        return `${p.x},${p.y}`;
      })
      .join(' ');

  const dataPoints = values.map((v, i) => getPoint(i, v));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={size} height={size} accessibilityLabel="Constitutional type radar chart">
      {/* Grid */}
      {Array.from({ length: levels }).map((_, level) => (
        <Polygon
          key={level}
          points={gridPoints(level + 1)}
          fill="none"
          stroke="#374151"
          strokeWidth={0.5}
        />
      ))}

      {/* Axes */}
      {labels.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <Line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="#374151"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Data */}
      <Polygon
        points={dataPath}
        fill="#B75F1930"
        stroke="#B75F19"
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <SvgCircle key={`dot-${i}`} cx={p.x} cy={p.y} r={4} fill="#B75F19" />
      ))}

      {/* Labels */}
      {labels.map((label, i) => {
        const p = getPoint(i, 120);
        return (
          <SvgText
            key={`label-${i}`}
            x={p.x}
            y={p.y}
            fill="#ffffff"
            fontSize={12}
            fontWeight="600"
            textAnchor="middle"
            alignmentBaseline="central"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function ConstitutionalType({ system, scores, isLoading }: ConstitutionalTypeProps) {
  if (isLoading) return <ConstitutionalTypeSkeleton />;

  const labels =
    system === 'ayurvedic'
      ? ['Vata', 'Pitta', 'Kapha']
      : ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

  const values =
    system === 'ayurvedic'
      ? [(scores as AyurvedicScores).vata, (scores as AyurvedicScores).pitta, (scores as AyurvedicScores).kapha]
      : [
          (scores as TCMScores).wood,
          (scores as TCMScores).fire,
          (scores as TCMScores).earth,
          (scores as TCMScores).metal,
          (scores as TCMScores).water,
        ];

  const dominant = labels[values.indexOf(Math.max(...values))];

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      className="bg-dark-card rounded-2xl p-4 border border-dark-border"
      accessibilityLabel={`${system === 'ayurvedic' ? 'Ayurvedic' : 'TCM'} constitution. Dominant type: ${dominant}`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-white text-lg font-bold">
          {system === 'ayurvedic' ? 'Ayurvedic Constitution' : 'TCM Five Elements'}
        </Text>
        <View className="bg-copper/10 rounded-full px-2.5 py-0.5">
          <Text className="text-copper text-xs font-semibold">{dominant}</Text>
        </View>
      </View>

      <View className="items-center">
        <RadarChart labels={labels} values={values} />
      </View>

      {/* Score breakdown */}
      <View className="flex-row justify-around mt-4">
        {labels.map((label, i) => (
          <View key={label} className="items-center">
            <Text className="text-white text-lg font-bold">{values[i]}</Text>
            <Text className="text-dark-border text-xs">{label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function ConstitutionalTypeSkeleton() {
  return (
    <View className="bg-dark-card rounded-2xl p-4 border border-dark-border items-center">
      <View className="w-40 h-5 rounded bg-dark-border animate-pulse mb-4 self-start" />
      <View className="w-[250px] h-[250px] rounded-full bg-dark-border/30 animate-pulse" />
    </View>
  );
}
