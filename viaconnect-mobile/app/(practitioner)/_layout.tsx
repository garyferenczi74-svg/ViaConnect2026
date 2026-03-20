import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { ViaConnectLogo } from '../../src/components/ui';

const ACTIVE_GREEN = '#4ADE80';
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
          color: focused ? ACTIVE_GREEN : INACTIVE,
          fontWeight: focused ? '600' : '400',
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function PractitionerLayout() {
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
        tabBarActiveTintColor: ACTIVE_GREEN,
        tabBarInactiveTintColor: INACTIVE,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <ViaConnectLogo size={100} showWordmark={false} />,
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" label="Dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" label="Patients" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="protocols"
        options={{
          title: 'Protocols',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" label="Protocols" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="📈" label="Analytics" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" label="Settings" focused={focused} />,
        }}
      />
      {/* Hidden tabs — accessible via navigation, not in tab bar */}
      <Tabs.Screen name="genomics" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="interactions" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="ehr" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="ai" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
