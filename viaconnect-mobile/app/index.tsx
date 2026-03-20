import { View, Text, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsDesktop } from '../src/components/shared/ResponsiveLayout';

export default function HomeScreen() {
  const router = useRouter();
  const isDesktop = useIsDesktop();

  return (
    <View className="flex-1 items-center justify-center bg-dark-bg px-6">
      <Text className="text-4xl font-bold text-white mb-2">ViaConnect</Text>
      <Text className="text-lg text-copper mb-1">GeneX360</Text>
      <Text className="text-sm text-sage text-center mb-8">
        One Genome. One Formulation. One Life at a Time.
      </Text>

      {isDesktop && (
        <Text className="text-teal-light text-xs mb-6 bg-teal/10 px-4 py-2 rounded-full">
          Desktop experience — sidebar navigation enabled
        </Text>
      )}

      <View className={`w-full gap-4 ${isDesktop ? 'max-w-md' : ''}`}>
        <Pressable
          onPress={() => router.push('/(consumer)' as any)}
          className="bg-teal rounded-2xl py-4 px-6 items-center active:opacity-80"
        >
          <Text className="text-white text-lg font-semibold">
            Personal Wellness
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(practitioner)' as any)}
          className="bg-portal-green rounded-2xl py-4 px-6 items-center active:opacity-80"
        >
          <Text className="text-dark-bg text-lg font-semibold">
            Practitioner Portal
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(naturopath)' as any)}
          className="bg-plum rounded-2xl py-4 px-6 items-center active:opacity-80"
        >
          <Text className="text-white text-lg font-semibold">
            Naturopath Portal
          </Text>
        </Pressable>
      </View>

      <Text className="text-dark-border text-xs mt-12">
        FarmCeutica Wellness LLC — Buffalo, NY
      </Text>
    </View>
  );
}
