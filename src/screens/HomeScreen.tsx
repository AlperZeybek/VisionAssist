/**
 * VisionAssist - Ana Ekran
 * Referans görsel ile birebir eşleştirilmiş açık mavi-gri tema.
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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Marka Başlığı ──────────────────────────────────────── */}
        <View style={styles.header} accessible accessibilityRole="header">
          <View style={styles.logoBox}>
            <Text style={styles.logoWave}>♿</Text>
          </View>
          <View style={styles.brandTexts}>
            <Text style={styles.brandName}>VisionAssist</Text>
            <Text style={styles.brandSub}>Görme Engelliler İçin Mobil Rehber</Text>
          </View>
        </View>

        {/* ── Aktif Navigasyon Kartı ─────────────────────────────── */}
        {isGuiding && route && (
          <View style={styles.activeNavCard} accessible accessibilityRole="summary">
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
            accessibilityLabel="Algılamayı Başlat"
            activeOpacity={0.85}
          >
            <View style={styles.circleRing2} />
            <View style={styles.circleRing1} />
            <View style={styles.circleInner}>
              {/* Yayın (wifi) ikonu — 3 yay + merkez nokta */}
              <View style={styles.waveIcon}>
                <View style={[styles.waveArc, styles.waveArc3]} />
                <View style={[styles.waveArc, styles.waveArc2]} />
                <View style={[styles.waveArc, styles.waveArc1]} />
                <View style={styles.waveDot} />
              </View>
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

        {/* ── Mevcut Mod + Sesli Yönlendirme Kartı ─────────────── */}
        <View style={styles.statusCard}>
          {/* Mevcut Mod satırı */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Mevcut Mod</Text>
            <View style={styles.statusRight}>
              <Text style={styles.statusValue}>{modeLabel} Aktif</Text>
              <View style={styles.statusDot} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Sesli Yönlendirme Toggle */}
          <View style={styles.statusRow}>
            <Text style={styles.speakerIcon}>🔊</Text>
            <View style={styles.toggleTexts}>
              <Text style={styles.toggleLabel}>Sesli Yönlendirme</Text>
              <Text style={styles.toggleSub}>Aktif</Text>
            </View>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={(val) => updateSettings({ hapticEnabled: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.surface}
              accessible
              accessibilityLabel="Sesli yönlendirme"
              accessibilityRole="switch"
            />
          </View>
        </View>

        {/* ── Ayarlar ───────────────────────────────────────────── */}
        <View style={styles.bottomAction}>
          <AccessibleButton
            label="Ayarlar"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Ayarlar' })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWave: { fontSize: 28 },
  brandTexts: { flex: 1 },
  brandName: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  brandSub: {
    fontSize: FONT_SIZES.small - 4,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Aktif nav kartı
  activeNavCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  activeNavTitle: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.large,
    fontWeight: '800',
  },
  activeNavDetail: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },

  // Dairesel buton
  mainButtonWrapper: { alignItems: 'center', marginBottom: SPACING.xl },
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
    backgroundColor: 'rgba(26, 95, 186, 0.12)',
  },
  circleRing1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(26, 95, 186, 0.22)',
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
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  // Wifi/yayın ikonu
  waveIcon: { alignItems: 'center', justifyContent: 'flex-end', height: 56 },
  waveArc: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  waveArc3: { width: 56, height: 28, bottom: 12 },
  waveArc2: { width: 38, height: 19, bottom: 14 },
  waveArc1: { width: 22, height: 11, bottom: 16 },
  waveDot: {
    position: 'absolute',
    bottom: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  circleLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.small - 2,
    fontWeight: '800',
    letterSpacing: 1.0,
    textAlign: 'center',
  },

  section: { marginBottom: SPACING.lg },

  // Durum kartı
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
  statusLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusValue: {
    fontSize: FONT_SIZES.small,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  speakerIcon: { fontSize: 22 },
  toggleTexts: { flex: 1 },
  toggleLabel: { fontSize: FONT_SIZES.small, fontWeight: '700', color: COLORS.textPrimary },
  toggleSub: { fontSize: FONT_SIZES.small - 4, color: COLORS.textSecondary },

  bottomAction: { marginTop: SPACING.sm },
});
