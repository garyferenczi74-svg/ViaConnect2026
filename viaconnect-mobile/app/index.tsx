import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-dark-bg px-6">
      <Text className="text-4xl font-bold text-white mb-2">ViaConnect</Text>
      <Text className="text-lg text-copper mb-1">GeneX360</Text>
      <Text className="text-sm text-sage text-center mb-8">
        One Genome. One Formulation. One Life at a Time.
      </Text>

      <View className="w-full gap-4">
        <Pressable className="bg-teal rounded-2xl py-4 px-6 items-center active:opacity-80">
          <Text className="text-white text-lg font-semibold">
            Personal Wellness
          </Text>
        </Pressable>

        <Pressable
          className="bg-portal-green rounded-2xl py-4 px-6 items-center active:opacity-80"
          onPress={() => router.push('/(practitioner)')}
        >
          <Text className="text-dark-bg text-lg font-semibold">
            Practitioner Portal
          </Text>
        </Pressable>

        <Pressable className="bg-plum rounded-2xl py-4 px-6 items-center active:opacity-80">
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
