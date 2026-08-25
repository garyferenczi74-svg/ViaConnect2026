import React from 'react';
import { View, Text } from 'react-native';
import { Swords, MessageCircle, Flame } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';

export function HelixArena() {
  return (
    <View>
      <GlassCard className="p-5 mb-4">
        <View className="flex-row items-center mb-3">
          <Swords size={20} strokeWidth={1.5} color="#B75E18" />
          <Text className="text-lg font-extrabold text-copper ml-2">Weekly Arena</Text>
        </View>
        <Text className="text-[13px] text-white/45 leading-5">
          Ranks appear once enough members are active this week.
        </Text>
      </GlassCard>

      <GlassCard className="p-5 mb-4">
        <View className="flex-row items-center mb-3">
          <MessageCircle size={20} strokeWidth={1.5} color="#B75E18" />
          <Text className="text-lg font-extrabold text-copper ml-2">Squad Chat</Text>
        </View>
        <Text className="text-[13px] text-white/45 leading-5">
          Squad Chat is not live. There are no messages until a real thread exists.
        </Text>
      </GlassCard>

      <View className="flex-row items-center mb-3">
        <Flame size={20} strokeWidth={1.5} color="#B75E18" />
        <Text className="text-lg font-extrabold text-copper ml-2">Active Challenges</Text>
      </View>
      <Text className="text-[13px] text-white/45">
        Challenges appear when one is published.
      </Text>
    </View>
  );
}
