import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { ViaConnectLogo } from '../../src/components/ui';

const PLUM = '#6D597A';
const SAGE = '#76866F';
const DARK_BG = '#111827';
const DARK_CARD = '#1F2937';
const INACTIVE = '#6B7280';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
      <Text
        style={{
          fontSize: 10,
          color: focused ? PLUM : INACTIVE,
          fontWeight: focused ? '600' : '400',
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function NaturopathLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: DARK_BG },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: DARK_CARD,
          borderTopColor: '#374151',
          height: 72,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: PLUM,
        tabBarInactiveTintColor: INACTIVE,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <ViaConnectLogo size={100} showWordmark={false} />,
          tabBarIcon: ({ focused }) => <TabIcon icon="🌿" label="Dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="botanical"
        options={{
          title: 'Botanical',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="🧪" label="Botanical" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="constitutional"
        options={{
          title: 'Assess',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="📝" label="Assess" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scheduler"
        options={{
          title: 'Schedule',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" label="Schedule" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="compliance"
        options={{
          title: 'Compliance',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="🛡️" label="Compliance" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
