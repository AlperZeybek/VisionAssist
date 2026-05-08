/**
 * VisionAssist - Kamera / Algılama Ekranı (v3 - Yapay Zeka Entegrasyonlu)
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar, Dimensions
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

import { useCamera } from '../hooks/useCamera';
import { useMLModel } from '../hooks/useMLModel';
import { useVisionAssistFrameProcessor } from '../hooks/useVisionAssistFrameProcessor';
import { useAppContext } from '../context/AppContext';
import AccessibleButton from '../components/AccessibleButton';
import ObstacleOverlay from '../components/ObstacleOverlay';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';
import { speechService } from '../services/accessibility/SpeechService';
import { getObstacleMessage } from '../utils/helpers';
import { ObstacleInfo } from '../utils/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const device = useCameraDevice('back');

  const { hasPermission, requestPermission, isRequesting } = useCamera();
  const { settings, currentMode } = useAppContext();
  const [isActive, setIsActive] = useState(false);
  const [obstacles, setObstacles] = useState<ObstacleInfo[]>([]);

  // TFLite modeli ve labellerı al
  const { model, state: modelState, labels } = useMLModel();

  // Modelden yeni çıktılar geldiğinde
  const handleObstaclesDetected = useCallback((newObstacles: ObstacleInfo[]) => {
    if (!isActive) return;
    setObstacles(newObstacles);

    // En kritik engeli (yakınlık > 0.5) seç
    const critical = newObstacles.filter(o => (o.proximityScore ?? 0) > 0.5).sort((a,b) => (b.proximityScore ?? 0) - (a.proximityScore ?? 0))[0];
    if (critical) {
      const msg = getObstacleMessage(critical, settings.language);
      speechService.speak(msg, critical.riskLevel);
    }
  }, [isActive, settings.language]);

  // JS bağımsız çalışan Native Frame Processor (Worklet)
  const frameProcessor = useVisionAssistFrameProcessor(
    isActive ? model : null, 
    labels, 
    handleObstaclesDetected
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

  // İZİN EKRANI
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Kamera Ön İzleme */}
      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
          video={true}
          audio={false}
          pixelFormat="yuv"
        />

        {/* Engel Overlay */}
        <ObstacleOverlay obstacles={obstacles} visible={isActive} />

        {/* Model Durumu (AI Yükleniyor vb) */}
        {modelState !== 'loaded' && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Yapay Zeka Modeli Yükleniyor...</Text>
          </View>
        )}
      </View>

      {/* Kontrol Paneli */}
      <View style={styles.controlPanel}>
        <View style={styles.buttonContainer}>
          <AccessibleButton
            label={isActive ? 'Algılamayı Durdur' : 'Algılamayı Başlat'}
            onPress={toggleDetection}
            accessibilityHint={isActive ? 'Durdurur' : 'Başlatır'}
            icon={isActive ? '⏹️' : '▶️'}
            variant={isActive ? 'danger' : 'success'}
            fullWidth
            large
            disabled={modelState !== 'loaded'}
          />

          {isActive && (
            <AccessibleButton
              label="Acil Durdur"
              onPress={emergencyStop}
              icon="🛑"
              variant="danger"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  permissionIcon: { fontSize: 80, marginBottom: SPACING.lg },
  permissionTitle: { fontSize: FONT_SIZES.xlarge, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.md },
  permissionDescription: { fontSize: FONT_SIZES.medium, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 28 },
  cameraContainer: { flex: 1, maxHeight: SCREEN_HEIGHT * 0.60, overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.medium, fontWeight: '600' },
  controlPanel: { flex: 1, paddingTop: SPACING.xl, paddingHorizontal: SPACING.md },
  buttonContainer: { gap: SPACING.md }
});
