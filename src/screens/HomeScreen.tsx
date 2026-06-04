/**
 * VisionAssist - Ana Ekran
 * Görme engelli kullanıcılar için tasarlanmış ana kontrol paneli.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import ModeSelector from '../components/ModeSelector';
import { useAppContext } from '../context/AppContext';
import { useNavigationContext } from '../context/NavigationContext';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';
import { DetectionMode } from '../utils/types';
import AccessibleButton from '../components/AccessibleButton';

type RootStackParamList = {
  MainTabs: { screen?: string } | undefined;
  DestinationPicker: undefined;
};

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentMode, setCurrentMode, settings, updateSettings } = useAppContext();
  const { route, isGuiding, stopNavigation, remainingDistanceMeters } =
    useNavigationContext();

  const prevModeRef = useRef<DetectionMode>(currentMode);
  useEffect(() => {
    if (
      prevModeRef.current !== DetectionMode.NAVIGATION &&
      currentMode === DetectionMode.NAVIGATION &&
      !route
    ) {
      navigation.navigate('DestinationPicker');
    }
    prevModeRef.current = currentMode;
  }, [currentMode, route, navigation]);

  const handleStartDetection = () => {
    if (currentMode === DetectionMode.NAVIGATION && !route) {
      navigation.navigate('DestinationPicker');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('MainTabs', { screen: 'Algılama' });
  };

  const modeLabel =
    currentMode === DetectionMode.STREET
      ? 'Sokak Modu'
      : currentMode === DetectionMode.INDOOR
      ? 'İç Mekan Modu'
      : 'Navigasyon Modu';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Marka Başlığı ──────────────────────────────────────── */}
        <View style={styles.header} accessible accessibilityRole="header">
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>♿</Text>
            </View>
            <View style={styles.brandTexts}>
              <Text style={styles.brandName}>VisionAssist</Text>
              <Text style={styles.brandSub}>Görme Engelliler İçin Mobil Rehber</Text>
            </View>
          </View>
        </View>

        {/* ── Aktif Navigasyon Kartı ─────────────────────────────── */}
        {isGuiding && route && (
          <View
            style={styles.activeNavCard}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={`Aktif navigasyon: ${route.destination.shortName}, kalan ${Math.round(remainingDistanceMeters)} metre`}
          >
            <Text style={styles.activeNavTitle} numberOfLines={1}>
              🧭 {route.destination.shortName}
            </Text>
            <Text style={styles.activeNavDetail}>
              Kalan: {(remainingDistanceMeters / 1000).toFixed(2)} km
            </Text>
            <AccessibleButton
              label="Navigasyonu Durdur"
              onPress={stopNavigation}
              icon="🛑"
              variant="danger"
              fullWidth
              accessibilityHint="Aktif yol tarifini sonlandırır"
            />
          </View>
        )}

        {/* ── Ana Dairesel Buton ─────────────────────────────────── */}
        <View style={styles.mainButtonWrapper}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={handleStartDetection}
            accessible
            accessibilityRole="button"
            accessibilityLabel={
              currentMode === DetectionMode.NAVIGATION && !route
                ? 'Hedef Seç ve Başla'
                : 'Algılamayı Başlat'
            }
            accessibilityHint="Kamerayı açarak engel algılamaya başlar"
            activeOpacity={0.85}
          >
            {/* İç daireler (dalga efekti) */}
            <View style={styles.circleRing2} />
            <View style={styles.circleRing1} />
            <View style={styles.circleInner}>
              <Text style={styles.circleIcon}>📡</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.circleLabel}>
            {currentMode === DetectionMode.NAVIGATION && !route
              ? 'HEDEF SEÇ VE BAŞLA'
              : 'ALGILAMAYI BAŞLAT'}
          </Text>
        </View>

        {/* ── Mod Seçici ────────────────────────────────────────── */}
        <View style={styles.section}>
          <ModeSelector
            currentMode={currentMode}
            onModeChange={setCurrentMode}
          />
        </View>

        {/* ── Mevcut Mod Göstergesi ─────────────────────────────── */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusDotWrapper}>
              <View style={styles.statusDot} />
            </View>
            <View style={styles.statusTexts}>
              <Text style={styles.statusLabel}>Mevcut Mod</Text>
              <Text style={styles.statusValue}>{modeLabel} Aktif</Text>
            </View>
          </View>

          {/* ── Sesli Yönlendirme Toggle ──────────────────────────── */}
          <View style={[styles.statusRow, styles.toggleRow]}>
            <Text style={styles.toggleIcon}>🔊</Text>
            <View style={styles.statusTexts}>
              <Text style={styles.statusValue}>Sesli Yönlendirme</Text>
              <Text style={styles.statusLabel}>
                {settings.hapticEnabled ? 'Aktif' : 'Pasif'}
              </Text>
            </View>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={(val) => updateSettings({ hapticEnabled: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.textPrimary}
              accessible
              accessibilityLabel="Sesli yönlendirme"
              accessibilityRole="switch"
            />
          </View>
        </View>

        {/* ── Alt Ayarlar Butonu ────────────────────────────────── */}
        <View style={styles.bottomAction}>
          <AccessibleButton
            label="Ayarlar"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Ayarlar' })}
            accessibilityHint="Uygulama ayarlarını açar"
            icon="⚙️"
            variant="secondary"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  // Marka başlığı
  header: { marginBottom: SPACING.xl },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: { fontSize: 28 },
  brandTexts: { flex: 1 },
  brandName: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  brandSub: {
    fontSize: FONT_SIZES.small - 2,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Aktif navigasyon kartı
  activeNavCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  activeNavTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.large,
    fontWeight: '800',
  },
  activeNavDetail: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },

  // Dairesel ana buton
  mainButtonWrapper: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  circleButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  circleRing2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  circleRing1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
  },
  circleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  circleIcon: { fontSize: 40 },
  circleLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.small,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
  },

  // Mod seçici
  section: { marginBottom: SPACING.lg },

  // Durum kartı (mevcut mod + sesli yönlendirme)
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  toggleRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statusDotWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
  },
  toggleIcon: { fontSize: 24 },
  statusTexts: { flex: 1 },
  statusLabel: {
    fontSize: FONT_SIZES.small - 2,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: FONT_SIZES.small,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  bottomAction: { marginTop: SPACING.sm },
});
