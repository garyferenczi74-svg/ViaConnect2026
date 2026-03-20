import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useIsDesktop } from './ResponsiveLayout';

export type NavItem = {
  label: string;
  icon: string;
  href: string;
};

type DashboardShellProps = {
  children: React.ReactNode;
  navItems: NavItem[];
  portalName: string;
  portalColor: string;
  userName?: string;
};

/** Sidebar width in pixels */
const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 64;

function SidebarNav({
  navItems,
  portalName,
  portalColor,
  userName,
  collapsed,
  onToggleCollapse,
}: {
  navItems: NavItem[];
  portalName: string;
  portalColor: string;
  userName?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View
      className="bg-dark-card border-r border-dark-border h-full justify-between"
      style={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
    >
      {/* Logo & Portal Name */}
      <View>
        <Pressable
          onPress={onToggleCollapse}
          className="px-4 py-5 border-b border-dark-border flex-row items-center"
        >
          <View
            className="w-8 h-8 rounded-lg items-center justify-center"
            style={{ backgroundColor: portalColor }}
          >
            <Text className="text-white font-bold text-sm">V</Text>
          </View>
          {!collapsed && (
            <View className="ml-3">
              <Text className="text-white font-semibold text-sm">
                ViaConnect
              </Text>
              <Text className="text-sage text-xs">{portalName}</Text>
            </View>
          )}
        </Pressable>

        {/* Nav Links */}
        <ScrollView className="px-2 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href as any)}
                className={`flex-row items-center rounded-xl px-3 py-3 mb-1 ${
                  isActive ? 'bg-teal/20' : 'active:bg-dark-border/50'
                }`}
              >
                <Text
                  className={`text-lg ${isActive ? 'text-copper' : 'text-sage'}`}
                >
                  {item.icon}
                </Text>
                {!collapsed && (
                  <Text
                    className={`ml-3 text-sm font-medium ${
                      isActive ? 'text-white' : 'text-sage'
                    }`}
                  >
                    {item.label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* User Info */}
      <View className="px-3 py-4 border-t border-dark-border flex-row items-center">
        <View className="w-8 h-8 rounded-full bg-plum items-center justify-center">
          <Text className="text-white text-xs font-bold">
            {(userName ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        {!collapsed && (
          <Text className="ml-3 text-sage text-sm" numberOfLines={1}>
            {userName ?? 'User'}
          </Text>
        )}
      </View>
    </View>
  );
}

function BottomTabBar({
  navItems,
  portalColor,
}: {
  navItems: NavItem[];
  portalColor: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View className="flex-row bg-dark-card border-t border-dark-border pb-5 pt-2 px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href as any)}
            className="flex-1 items-center py-1"
          >
            <Text
              className={`text-xl ${isActive ? 'text-copper' : 'text-sage'}`}
            >
              {item.icon}
            </Text>
            <Text
              className={`text-[10px] mt-0.5 ${
                isActive ? 'text-white' : 'text-sage'
              }`}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function DashboardShell({
  children,
  navItems,
  portalName,
  portalColor,
  userName,
}: DashboardShellProps) {
  const isDesktop = useIsDesktop();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (isDesktop) {
    return (
      <View className="flex-1 flex-row bg-dark-bg">
        <SidebarNav
          navItems={navItems}
          portalName={portalName}
          portalColor={portalColor}
          userName={userName}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <View className="flex-1">{children}</View>
      </View>
    );
  }

  // Mobile layout: content + bottom tabs
  return (
    <View className="flex-1 bg-dark-bg">
      <View className="flex-1">{children}</View>
      <BottomTabBar navItems={navItems} portalColor={portalColor} />
    </View>
  );
}
