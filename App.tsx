/**
 * VisionAssist - Ana Uygulama Girişi
 * 
 * Uygulama kök bileşeni. Tüm provider'ları ve
 * navigasyonu bir araya getirir.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}
