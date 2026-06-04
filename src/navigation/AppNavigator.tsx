/**
 * VisionAssist - Uygulama Navigasyonu
 *
 * Yapı:
 *   RootStack
 *     ├── MainTabs (Bottom Tabs: Ana / Algılama / Ayarlar)
 *     └── DestinationPicker (modal — navigasyon hedef seçimi)
 *
 * Bottom tab navigasyonu görme engelli kullanıcılar için
 * büyük ve erişilebilir; modal ekran ise hedef seçimi için
 * tüm ekranı kaplayan, geri yönlendirmeli bir akış sağlar.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DestinationPickerScreen from '../screens/DestinationPickerScreen';
import { COLORS, FONT_SIZES, MIN_TOUCH_SIZE } from '../utils/constants';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function MainTabs() {
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
          tabBarLabel: 'Ana Ekran',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>🏠</Text>
          ),
          tabBarAccessibilityLabel: 'Ana ekran sekmesi',
        }}
      />
      <Tab.Screen
        name="Algılama"
        component={CameraScreen}
        options={{
          tabBarLabel: 'Algılama',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📷</Text>
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
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>⚙️</Text>
          ),
          tabBarAccessibilityLabel: 'Ayarlar sekmesi',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen
        name="DestinationPicker"
        component={DestinationPickerScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </RootStack.Navigator>
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
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
  },
});
