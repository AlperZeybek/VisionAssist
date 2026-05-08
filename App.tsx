/**
 * VisionAssist - Ana Uygulama Girişi
 * 
 * Uygulama kök bileşeni. Tüm provider'ları ve
 * navigasyonu bir araya getirir.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider } from './src/context/AppContext';
import { NavigationProvider } from './src/context/NavigationContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AppProvider>
      <NavigationProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </NavigationProvider>
    </AppProvider>
  );
}
