import React from 'react';
import { View, Text } from 'react-native';
import { Megaphone } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';

export function HelixRefer() {
  return (
    <View>
      <GlassCard className="p-5 mb-4">
        <View className="flex-row items-center mb-2">
          <Megaphone size={20} strokeWidth={1.5} color="#B75E18" />
          <Text className="text-lg font-extrabold text-copper ml-2">
            Invite & Earn Together
          </Text>
        </View>
        <Text className="text-[12px] text-white/35 leading-5 mb-4">
          Share your unique referral code with friends and family. When they join
          ViaConnect, you both earn Helix rewards.
        </Text>
        <Text className="text-[13px] text-white/45">
          Not enough data. A code appears from helix_referral_codes, never a staged GARY code.
        </Text>
      </GlassCard>
    </View>
  );
}
