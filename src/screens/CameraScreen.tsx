/**
 * VisionAssist - Kamera / Algılama Ekranı
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Dimensions, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

import { useCamera } from '../hooks/useCamera';
import { useMLModel } from '../hooks/useMLModel';
import { useVisionAssistFrameProcessor } from '../hooks/useVisionAssistFrameProcessor';
import { useAppContext } from '../context/AppContext';
import { useNavigationContext } from '../context/NavigationContext';
import AccessibleButton from '../components/AccessibleButton';
import ObstacleOverlay from '../components/ObstacleOverlay';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';
import { speechService } from '../services/accessibility/SpeechService';
import { getObstacleMessage } from '../utils/helpers';
import { ObstacleInfo } from '../utils/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/** OSRM manevra türünü basit bir ok karakterine dönüştürür */
function maneuverArrow(instruction: string): string {
  const lower = instruction.toLowerCase();
  if (lower.includes('sola')) return '←';
  if (lower.includes('sağa')) return '→';
  if (lower.includes('düz') || lower.includes('devam')) return '↑';
  if (lower.includes('döner kavşak')) return '↻';
  if (lower.includes('ulaştınız') || lower.includes('varış')) return '✓';
  return '↑';
}

export default function CameraScreen() {
  const device = useCameraDevice('back');

  const { hasPermission, requestPermission, isRequesting } = useCamera();
  const { settings, currentMode } = useAppContext();
  const {
    route,
    isGuiding,
    currentStepIndex,
    remainingDistanceMeters,
    stopNavigation,
  } = useNavigationContext();

  const [isActive, setIsActive] = useState(false);
  const [obstacles, setObstacles] = useState<ObstacleInfo[]>([]);

  const { model, state: modelState, labels } = useMLModel();

  const currentStep = route?.steps[currentStepIndex];

  const handleObstaclesDetected = useCallback((newObstacles: ObstacleInfo[]) => {
    if (!isActive) return;
    setObstacles(newObstacles);

    // En yakın/kritik engeli seç — proximityScore 0.25+ yeterli (orta mesafe dahil)
    const critical = newObstacles
      .filter(o => (o.proximityScore ?? 0) > 0.25)
      .sort((a, b) => (b.proximityScore ?? 0) - (a.proximityScore ?? 0))[0];

    if (critical) {
      const msg = getObstacleMessage(critical, settings.language);
      speechService.speak(msg, critical.riskLevel);
    }
  }, [isActive, settings.language]);

  const frameProcessor = useVisionAssistFrameProcessor(
    isActive ? model : null,
    labels,
    handleObstaclesDetected,
    currentMode
  );

  const toggleDetection = useCallback(() => {
    if (isActive) {
      setIsActive(false);
      speechService.speak('Algılama durduruldu.');
      setObstacles([]);
    } else {
      setIsActive(true);
      speechService.speak('YZ Algılaması başlatıldı.');
    }
  }, [isActive]);

  const emergencyStop = useCallback(() => {
    setIsActive(false);
    speechService.stop();
    setObstacles([]);
  }, []);

  // ── İzin Ekranı ────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📸</Text>
          <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permissionDescription}>
            Yapay Zeka nesne tespiti için kameranıza erişim izni gereklidir.
          </Text>
          <AccessibleButton
            label="Kamera İzni Ver"
            onPress={requestPermission}
            accessibilityHint="Kamera izni ister"
            icon="🔐"
            variant="primary"
            fullWidth
            large
            disabled={isRequesting}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionTitle}>Kamera Cihazı Bulunamadı!</Text>
      </SafeAreaView>
    );
  }

  // ── Ana Ekran ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Kamera Görüntüsü */}
      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
        />

        <ObstacleOverlay obstacles={obstacles} visible={isActive} />

        {/* Navigasyon Banner (üst) */}
        {isGuiding && currentStep && (
          <TouchableOpacity
            style={styles.navBanner}
            onPress={() => speechService.speak(currentStep.instruction)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Sıradaki adım: ${currentStep.instruction}`}
            accessibilityHint="Talimatı tekrar dinlemek için dokunun"
            activeOpacity={0.7}
          >
            {/* Yön oku */}
            <View style={styles.navArrowBox}>
              <Text style={styles.navArrow}>
                {maneuverArrow(currentStep.instruction)}
              </Text>
            </View>

            {/* Talimat ve mesafe */}
            <View style={styles.navBannerContent}>
              <Text style={styles.navBannerStep} numberOfLines={2}>
                {currentStep.instruction}
              </Text>
              <Text style={styles.navBannerMeta}>
                Kalan: {(remainingDistanceMeters / 1000).toFixed(1)} km
                {route && ` • ${route.destination.shortName}`}
              </Text>
            </View>

            {/* Mikrofon butonu (sağ üst) */}
            <View style={styles.navMicButton}>
              <Text style={styles.navMicIcon}>🎙️</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Model Yükleniyor */}
        {modelState !== 'loaded' && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Yapay Zeka Modeli Yükleniyor...</Text>
          </View>
        )}
      </View>

      {/* ── Alt Kontrol Paneli ─────────────────────────────────── */}
      <View style={styles.controlPanel}>
        {/* 3 yuvarlak ikon butonu (görsel tasarımına uygun) */}
        <View style={styles.iconButtonRow}>
          {/* Hoparlör */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              if (isActive && obstacles.length > 0) {
                const top = obstacles[0];
                speechService.speak(getObstacleMessage(top, settings.language), top.riskLevel);
              }
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Son uyarıyı tekrarla"
          >
            <Text style={styles.iconButtonText}>🔊</Text>
          </TouchableOpacity>

          {/* Ana Algılama Butonu (orta, büyük) */}
          <TouchableOpacity
            style={[
              styles.iconButtonLarge,
              isActive && styles.iconButtonLargeActive,
            ]}
            onPress={toggleDetection}
            disabled={modelState !== 'loaded'}
            accessible
            accessibilityRole="button"
            accessibilityLabel={isActive ? 'Algılamayı Durdur' : 'Algılamayı Başlat'}
          >
            <Text style={styles.iconButtonLargeText}>
              {isActive ? '⏹' : '🎙'}
            </Text>
          </TouchableOpacity>

          {/* Fener */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={emergencyStop}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Acil durdur"
          >
            <Text style={styles.iconButtonText}>🔦</Text>
          </TouchableOpacity>
        </View>

        {/* Navigasyonu Durdur (varsa) */}
        {isGuiding && (
          <TouchableOpacity
            style={styles.stopNavButton}
            onPress={stopNavigation}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Navigasyonu durdur"
          >
            <Text style={styles.stopNavText}>Navigasyonu Durdur</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // İzin ekranı
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  permissionIcon: { fontSize: 80, marginBottom: SPACING.lg },
  permissionTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  permissionDescription: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 28,
  },

  // Kamera
  cameraContainer: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.65,
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },

  // Navigasyon banner
  navBanner: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: 'rgba(10, 22, 40, 0.93)',
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.4)',
  },
  navArrowBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrow: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  navBannerContent: { flex: 1 },
  navBannerStep: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.small,
    fontWeight: '700',
    lineHeight: 20,
  },
  navBannerMeta: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.small - 4,
    marginTop: 3,
  },
  navMicButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navMicIcon: { fontSize: 18 },

  // Alt kontrol paneli
  controlPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  iconButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: { fontSize: 26 },
  iconButtonLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  iconButtonLargeActive: {
    backgroundColor: COLORS.riskHigh,
    shadowColor: COLORS.riskHigh,
  },
  iconButtonLargeText: { fontSize: 34 },
  stopNavButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stopNavText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.small - 2,
    fontWeight: '600',
  },
});
