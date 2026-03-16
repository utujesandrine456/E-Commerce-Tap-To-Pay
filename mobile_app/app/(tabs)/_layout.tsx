import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const isAgent = user?.role === 'agent';

  // Make bottom bar responsive to device navigation bar
  const paddingBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12);
  const tabHeight = 60 + paddingBottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: tabHeight,
          paddingBottom: paddingBottom,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          marginBottom: 0,
        },
      }}>
      {/* ===== SHARED: Home tab ===== */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />

      {/* ===== SALESPERSON ONLY: Sales tab ===== */}
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="cart.fill" color={color} />,
          href: isAgent ? null : '/(tabs)/sales',
        }}
      />

      {/* ===== AGENT ONLY: Cards tab (Holders, Top-Up, Register) ===== */}
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Cards',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="card.fill" color={color} />,
          href: isAgent ? '/(tabs)/cards' : null,
        }}
      />

      {/* ===== AGENT ONLY: Stock/Inventory tab ===== */}
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="cube.fill" color={color} />,
          href: isAgent ? ('/(tabs)/stock' as any) : null,
        }}
      />

      {/* ===== AGENT ONLY: Users Management tab ===== */}
      <Tabs.Screen
        name="users"
        options={{
          title: 'Team',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.2.fill" color={color} />,
          href: isAgent ? ('/(tabs)/users' as any) : null,
        }}
      />

      {/* ===== SHARED: History tab ===== */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="clock.fill" color={color} />,
        }}
      />

      {/* ===== SHARED: Profile tab ===== */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />

      {/* ===== HIDDEN: Explore (template screen, not needed) ===== */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
