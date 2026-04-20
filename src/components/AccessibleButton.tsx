/**
 * VisionAssist - Erişilebilir Buton Bileşeni
 * 
 * Görme engelli kullanıcılar için optimize edilmiş
 * büyük, yüksek kontrastlı buton.
 * 
 * Özellikleri:
 * - Minimum 56px dokunma alanı
 * - Yüksek kontrast renkler
 * - Tam ekran okuyucu desteği
 * - Basma geri bildirimi (haptic)
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT_SIZES, SPACING, MIN_TOUCH_SIZE } from '../utils/constants';

interface AccessibleButtonProps {
  /** Buton metni */
  label: string;
  /** Basma olayı */
  onPress: () => void;
  /** Erişilebilirlik ipucu */
  accessibilityHint?: string;
  /** Buton ikonu (emoji veya sembol) */
  icon?: string;
  /** Buton varyantı */
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  /** Tam genişlik */
  fullWidth?: boolean;
  /** Devre dışı */
  disabled?: boolean;
  /** Büyük boyut */
  large?: boolean;
  /** Özel stil */
  style?: ViewStyle;
  /** Özel metin stili */
  textStyle?: TextStyle;
  /** Titreşim geri bildirimi */
  haptic?: boolean;
}

export default function AccessibleButton({
  label,
  onPress,
  accessibilityHint,
  icon,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  large = false,
  style,
  textStyle,
  haptic = true,
}: AccessibleButtonProps) {
  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const buttonStyle: ViewStyle[] = [
    styles.button,
    styles[variant],
    fullWidth && styles.fullWidth,
    large && styles.large,
    disabled && styles.disabled,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  const labelStyle: TextStyle[] = [
    styles.label,
    large && styles.largeLabel,
    disabled && styles.disabledLabel,
    textStyle as TextStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      activeOpacity={0.7}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={labelStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    gap: SPACING.sm,
  },
  // Varyant stilleri
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  danger: {
    backgroundColor: COLORS.riskHigh,
  },
  success: {
    backgroundColor: COLORS.secondary,
  },
  // Boyut stilleri
  fullWidth: {
    width: '100%',
  },
  large: {
    minHeight: 80,
    paddingVertical: SPACING.lg,
    borderRadius: 20,
  },
  // Durum stilleri
  disabled: {
    opacity: 0.5,
  },
  // Metin stilleri
  label: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
    textAlign: 'center',
  },
  largeLabel: {
    fontSize: FONT_SIZES.large,
  },
  disabledLabel: {
    color: COLORS.textDisabled,
  },
  icon: {
    fontSize: FONT_SIZES.large,
  },
});
