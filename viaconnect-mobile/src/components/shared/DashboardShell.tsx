import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

// ── Types ────────────────────────────────────────────────────────────────────

export type PortalRole = 'consumer' | 'practitioner' | 'naturopath';

export interface TabDef {
  key: string;
  label: string;
  icon: string; // emoji placeholder — replace with icon lib
}

export interface DashboardShellProps {
  role: PortalRole;
  activeTab: string;
  onTabChange: (key: string) => void;
  notificationCount?: number;
  children: React.ReactNode;
}

// ── Tab Configurations ───────────────────────────────────────────────────────

const TABS: Record<PortalRole, TabDef[]> = {
  consumer: [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'genetics', label: 'Genetics', icon: '🧬' },
    { key: 'supplements', label: 'Supps', icon: '💊' },
    { key: 'tokens', label: 'Tokens', icon: '🪙' },
    { key: 'profile', label: 'Profile', icon: '👤' },
  ],
  practitioner: [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'patients', label: 'Patients', icon: '👥' },
    { key: 'protocols', label: 'Protocols', icon: '📋' },
    { key: 'analytics', label: 'Analytics', icon: '📈' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ],
  naturopath: [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'patients', label: 'Patients', icon: '👥' },
    { key: 'botanical', label: 'Botanical', icon: '🌿' },
    { key: 'assessment', label: 'Assess', icon: '📝' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ],
};

const ACCENT_COLORS: Record<PortalRole, string> = {
  consumer: 'text-copper',
  practitioner: 'text-portal-green',
  naturopath: 'text-plum',
};

const ACTIVE_BG: Record<PortalRole, string> = {
  consumer: 'bg-copper/10',
  practitioner: 'bg-portal-green/10',
  naturopath: 'bg-plum/10',
};

// ── Component ────────────────────────────────────────────────────────────────

export function DashboardShell({
  role,
  activeTab,
  onTabChange,
  notificationCount = 0,
  children,
}: DashboardShellProps) {
  const tabs = TABS[role];
  const accentColor = ACCENT_COLORS[role];

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Content */}
      <View className="flex-1">{children}</View>

      {/* Tab Bar */}
      <View className="flex-row bg-dark-card border-t border-dark-border px-2 pb-6 pt-2">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const showBadge = tab.key === 'home' || tab.key === 'dashboard';

          return (
            <Pressable
              key={tab.key}
              className={`flex-1 items-center py-2 rounded-xl ${isActive ? ACTIVE_BG[role] : ''}`}
              onPress={() => onTabChange(tab.key)}
              accessibilityLabel={`${tab.label} tab`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View className="relative">
                <Text className="text-lg">{tab.icon}</Text>
                {showBadge && notificationCount > 0 && (
                  <View className="absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1">
                    <Text className="text-white text-[10px] font-bold">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text className={`text-xs mt-0.5 ${isActive ? `${accentColor} font-semibold` : 'text-dark-border'}`}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function DashboardShellSkeleton() {
  return (
    <View className="flex-1 bg-dark-bg">
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#B75F19" size="large" />
      </View>
      <View className="flex-row bg-dark-card border-t border-dark-border px-2 pb-6 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} className="flex-1 items-center py-2">
            <View className="w-6 h-6 rounded-full bg-dark-border animate-pulse" />
            <View className="w-8 h-2 mt-1 rounded bg-dark-border animate-pulse" />
          </View>
        ))}
      </View>
    </View>
  );
}
