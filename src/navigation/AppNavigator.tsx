/**
 * VisionAssist - Uygulama Navigasyonu
 * 
 * Alt sekme (bottom tab) navigasyonu ile:
 * - Ana Ekran (home)
 * - Algılama (camera/detection)
 * - Ayarlar (settings)
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { COLORS, FONT_SIZES, MIN_TOUCH_SIZE } from '../utils/constants';

const Tab = createBottomTabNavigator();

/**
 * Alt sekme navigasyonu
 * Görme engelli kullanıcılar için büyük ve erişilebilir sekmeler.
 */
export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Ana"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => (
            <Text style={styles.tabIcon}>{focused ? '🏠' : '🏡'}</Text>
          ),
          tabBarAccessibilityLabel: 'Ana sayfa sekmesi',
        }}
      />
      <Tab.Screen
        name="Algılama"
        component={CameraScreen}
        options={{
          tabBarLabel: 'Algılama',
          tabBarIcon: ({ focused }) => (
            <Text style={styles.tabIcon}>{focused ? '📸' : '📷'}</Text>
          ),
          tabBarAccessibilityLabel: 'Engel algılama sekmesi',
        }}
      />
      <Tab.Screen
        name="Ayarlar"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ayarlar',
          tabBarIcon: ({ focused }) => (
            <Text style={styles.tabIcon}>{focused ? '⚙️' : '🔧'}</Text>
          ),
          tabBarAccessibilityLabel: 'Ayarlar sekmesi',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: FONT_SIZES.small - 2,
    fontWeight: '600',
  },
  tabItem: {
    minHeight: MIN_TOUCH_SIZE,
  },
  tabIcon: {
    fontSize: 24,
  },
});
