import React, { useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import {
  Activity,
  Apple,
  ClipboardList,
  Heart,
  Leaf,
  Moon,
  Pill,
  Shield,
} from 'lucide-react';
import {
  MORNING_CARD_PENDING_SCORE,
  MORNING_CARD_SCORE_LABEL,
  MORNING_CONTRIBUTOR_DISAGREE,
  MORNING_CONTRIBUTOR_PENDING_NOTE,
  buildMorningChips,
  chipByKey,
  colorForScore,
  firstIncompleteProtocolAction,
  type MarketingChipKey,
  type MorningChipView,
  type MorningProtocolCta,
  type MorningProtocolItem,
} from '../../lib/morning-card/model';

const CHIP_ICONS = {
  recovery: Heart,
  sleep: Moon,
  strain: Activity,
  regimen: Pill,
  nutrients: Apple,
  symptoms: ClipboardList,
  metabolic: Leaf,
  immune: Shield,
} as const;

export interface MorningCardProps {
  score: number | null;
  protocolItems: readonly MorningProtocolItem[];
  onTake?: (item: MorningProtocolItem) => void;
}

function ChipGrid({
  chips,
  selectedKey,
  onSelect,
  eightAcross,
}: {
  chips: readonly MorningChipView[];
  selectedKey: MarketingChipKey | null;
  onSelect: (key: MarketingChipKey) => void;
  eightAcross: boolean;
}) {
  return (
    <View className="flex-row flex-wrap" testID="morning-chip-grid">
      {chips.map((chip) => {
        const Icon = CHIP_ICONS[chip.key];
        const selected = selectedKey === chip.key;
        return (
          <Pressable
            key={chip.key}
            testID={`morning-chip-${chip.key}`}
            accessibilityRole="button"
            accessibilityLabel={`${chip.label}, sources ${chip.sourceStatus}`}
            accessibilityState={{ selected }}
            onPress={() => onSelect(chip.key)}
            style={{ width: eightAcross ? '12.5%' : '25%', padding: 4 }}
          >
            <View
              className="min-h-[44px] items-center justify-center rounded-xl border px-1 py-2"
              style={{
                borderColor: selected ? 'rgba(45,165,160,0.5)' : 'rgba(255,255,255,0.1)',
                backgroundColor: selected ? 'rgba(45,165,160,0.15)' : '#1A2744',
              }}
            >
              <Icon color="#2DA5A0" size={16} strokeWidth={1.5} />
              <Text className="mt-1 text-[10px] font-medium text-white/80">{chip.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ContributorList({ chip }: { chip: MorningChipView }) {
  return (
    <View
      testID={`morning-contributors-${chip.key}`}
      className="mt-3 rounded-xl border border-white/10 p-3"
      style={{ backgroundColor: '#1A2744' }}
    >
      <Text className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {chip.label} contributors
      </Text>
      {chip.contributors.map((row) => (
        <View
          key={row.id}
          testID={`morning-contributor-${row.id}`}
          className="min-h-[44px] flex-row items-center justify-between"
        >
          <Text className="text-sm text-white/80">{row.name}</Text>
          <View className="flex-row items-center">
            <Text className="font-mono text-sm text-white">{row.displayValue}</Text>
            {row.sourceStatus === 'disagree' ? (
              <Text className="ml-2 text-[10px] font-semibold uppercase text-[#B75E18]">
                {MORNING_CONTRIBUTOR_DISAGREE}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
      {chip.sourceStatus === 'pending' ? (
        <Text className="mt-2 text-xs text-white/50">{MORNING_CONTRIBUTOR_PENDING_NOTE}</Text>
      ) : null}
    </View>
  );
}

function ProtocolCta({
  cta,
  onTake,
}: {
  cta: MorningProtocolCta;
  onTake?: (item: MorningProtocolItem) => void;
}) {
  if (cta.kind !== 'action') {
    return (
      <View testID={`morning-cta-${cta.kind}`} className="min-h-[44px] justify-center">
        <Text className="text-sm text-[#2DA5A0]">{cta.label}</Text>
      </View>
    );
  }
  return (
    <Pressable
      testID="morning-cta-action"
      accessibilityRole="button"
      accessibilityLabel={cta.label}
      onPress={() => {
        if (cta.item) onTake?.(cta.item);
      }}
      className="min-h-[44px] flex-row items-center justify-center rounded-xl border px-4 py-2"
      style={{
        borderColor: 'rgba(45,165,160,0.4)',
        backgroundColor: 'rgba(45,165,160,0.15)',
      }}
    >
      <Pill color="#2DA5A0" size={16} strokeWidth={1.5} />
      <Text className="ml-2 text-sm font-semibold text-[#2DA5A0]">{cta.label}</Text>
    </Pressable>
  );
}

export function MorningCard({ score, protocolItems, onTake }: MorningCardProps) {
  const chips = useMemo(() => buildMorningChips(), []);
  const [selectedKey, setSelectedKey] = useState<MarketingChipKey | null>(null);
  const { width } = useWindowDimensions();
  const eightAcross = width >= 1024;
  const rowLayout = width >= 1024;
  const cta = firstIncompleteProtocolAction(protocolItems);
  const selectedChip = selectedKey ? chipByKey(chips, selectedKey) : null;
  const bandColor = score === null ? '#2DA5A0' : colorForScore(score);

  return (
    <View
      testID="morning-card"
      accessibilityLabel="Bio Optimization Score"
      className="relative overflow-hidden rounded-3xl border border-white/10 p-5"
      style={{ backgroundColor: '#1E3054' }}
    >
      <View style={{ flexDirection: rowLayout ? 'row' : 'column', alignItems: rowLayout ? 'flex-end' : 'stretch', justifyContent: 'space-between' }}>
        <View>
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {MORNING_CARD_SCORE_LABEL}
          </Text>
          <Text
            className="mt-1 text-5xl font-bold text-white"
            accessibilityLabel={
              score === null
                ? 'Bio Optimization Score not yet computed'
                : `Bio Optimization Score ${score}`
            }
          >
            {score === null ? MORNING_CARD_PENDING_SCORE : String(score)}
          </Text>
        </View>
        <View className={rowLayout ? '' : 'mt-4'}>
          <Text className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Today protocol
          </Text>
          <ProtocolCta cta={cta} onTake={onTake} />
        </View>
      </View>

      <View className="mt-5">
        <ChipGrid
          chips={chips}
          selectedKey={selectedKey}
          onSelect={(key) => setSelectedKey((prev) => (prev === key ? null : key))}
          eightAcross={eightAcross}
        />
      </View>

      {selectedChip ? <ContributorList chip={selectedChip} /> : null}

      <View
        pointerEvents="none"
        className="absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20"
        style={{ backgroundColor: bandColor }}
      />
    </View>
  );
}
