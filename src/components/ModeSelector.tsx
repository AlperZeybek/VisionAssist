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
    icon: '🏙️',
    description: 'Dış mekan engel algılama',
  },
  {
    mode: DetectionMode.INDOOR,
    label: 'İç Mekan',
    icon: '🏠',
    description: 'İç mekan engel algılama',
  },
  {
    mode: DetectionMode.NAVIGATION,
    label: 'Navigasyon',
    icon: '🧭',
    description: 'Yol tarifi modu (yakında)',
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
        const isDisabled = mode === DetectionMode.NAVIGATION;

        return (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeButton,
              isActive && styles.modeButtonActive,
              isDisabled && styles.modeButtonDisabled,
            ]}
            onPress={() => handleModePress(mode)}
            disabled={isDisabled}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel={`${label} modu`}
            accessibilityHint={description}
            accessibilityState={{
              selected: isActive,
              disabled: isDisabled,
            }}
          >
            <Text style={styles.modeIcon}>{icon}</Text>
            <Text
              style={[
                styles.modeLabel,
                isActive && styles.modeLabelActive,
                isDisabled && styles.modeLabelDisabled,
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
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  modeButtonDisabled: {
    opacity: 0.4,
  },
  modeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  modeLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeLabelActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  modeLabelDisabled: {
    color: COLORS.textDisabled,
  },
});
