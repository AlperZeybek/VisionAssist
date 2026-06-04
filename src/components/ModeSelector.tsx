/**
 * VisionAssist - Mod Seçici Bileşeni
 * 
 * Sokak / İç Mekan / Navigasyon modları arasında
 * geçiş yapılmasını sağlar.
 * 
 * Büyük ve erişilebilir dokunma alanları ile tasarlanmıştır.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { DetectionMode } from '../utils/types';
import { COLORS, FONT_SIZES, SPACING, MIN_TOUCH_SIZE } from '../utils/constants';

interface ModeSelectorProps {
  /** Aktif mod */
  currentMode: DetectionMode;
  /** Mod değişikliği callback'i */
  onModeChange: (mode: DetectionMode) => void;
}

const MODES = [
  {
    mode: DetectionMode.STREET,
    label: 'Sokak',
    icon: '🚶',
    description: 'Dış mekan engel algılama',
  },
  {
    mode: DetectionMode.INDOOR,
    label: 'İç Mekan',
    icon: '🏢',
    description: 'İç mekan engel algılama',
  },
  {
    mode: DetectionMode.NAVIGATION,
    label: 'Navigasyon',
    icon: '➤',
    description: 'Yol tarifi ve yön rehberliği modu',
  },
];

export default function ModeSelector({
  currentMode,
  onModeChange,
}: ModeSelectorProps) {
  const handleModePress = (mode: DetectionMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onModeChange(mode);
  };

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="tablist"
      accessibilityLabel="Algılama modu seçici"
    >
      {MODES.map(({ mode, label, icon, description }) => {
        const isActive = currentMode === mode;

        return (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeButton,
              isActive && styles.modeButtonActive,
            ]}
            onPress={() => handleModePress(mode)}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel={`${label} modu`}
            accessibilityHint={description}
            accessibilityState={{
              selected: isActive,
            }}
          >
            <Text style={styles.modeIcon}>{icon}</Text>
            <Text
              style={[
                styles.modeLabel,
                isActive && styles.modeLabelActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  modeButton: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    elevation: 3,
    shadowOpacity: 0.18,
  },
  modeIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  modeLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.small - 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
