/**
 * VisionAssist - Ana Ekran
 *
 * Kullanıcının uygulamayı açtığında gördüğü ilk ekran.
 * Büyük, erişilebilir butonlarla minimal etkileşim sağlar.
 *
 * Görme engelli kullanıcılar için tasarlanmıştır:
 * - Minimum buton sayısı
 * - Büyük dokunma alanları
 * - Yüksek kontrast
 * - Ekran okuyucu uyumlu
 *
 * Navigasyon modu seçildiğinde otomatik olarak hedef seçim ekranını
 * açar. Aktif rota varsa kullanıcıya hatırlatma kartı gösterir.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AccessibleButton from '../components/AccessibleButton';
import ModeSelector from '../components/ModeSelector';
import { useAppContext } from '../context/AppContext';
import { useNavigationContext } from '../context/NavigationContext';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';
import { DetectionMode } from '../utils/types';

type RootStackParamList = {
  MainTabs: { screen?: string } | undefined;
  DestinationPicker: undefined;
};

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentMode, setCurrentMode, settings } = useAppContext();
  const { route, isGuiding, stopNavigation, remainingDistanceMeters } =
    useNavigationContext();

  // Mod NAVIGATION'a geçildiğinde otomatik picker aç
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
    // Navigasyon modu + hedef yoksa picker'a yönlendir
    if (currentMode === DetectionMode.NAVIGATION && !route) {
      navigation.navigate('DestinationPicker');
      return;
    }
    navigation.navigate('MainTabs', { screen: 'Algılama' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View
          style={styles.header}
          accessible={true}
          accessibilityRole="header"
        >
          <Text style={styles.appIcon}>👁️</Text>
          <Text style={styles.title}>VisionAssist</Text>
          <Text style={styles.subtitle}>
            Gerçek Zamanlı Engel Algılama
          </Text>
        </View>

        {/* Aktif Navigasyon Kartı */}
        {isGuiding && route && (
          <View
            style={styles.activeNavCard}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={`Aktif navigasyon: ${route.destination.shortName}, kalan ${Math.round(
              remainingDistanceMeters
            )} metre`}
          >
            <Text style={styles.activeNavIcon}>🧭</Text>
            <Text style={styles.activeNavTitle} numberOfLines={1}>
              {route.destination.shortName}
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

        {/* Ana Buton */}
        <View style={styles.mainAction}>
          <AccessibleButton
            label={
              currentMode === DetectionMode.NAVIGATION && !route
                ? 'Hedef Seç ve Başla'
                : 'Algılamayı Başlat'
            }
            onPress={handleStartDetection}
            accessibilityHint={
              currentMode === DetectionMode.NAVIGATION && !route
                ? 'Hedef seçim ekranını açar'
                : 'Kamerayı açarak engel algılamaya başlar'
            }
            icon={
              currentMode === DetectionMode.NAVIGATION && !route ? '🧭' : '📸'
            }
            variant="primary"
            fullWidth
            large
          />
        </View>

        {/* Mod Seçimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Algılama Modu</Text>
          <ModeSelector
            currentMode={currentMode}
            onModeChange={setCurrentMode}
          />
        </View>

        {/* Hızlı Bilgi */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🔊</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Sesli Rehberlik</Text>
              <Text style={styles.infoDescription}>
                Engeller tespit edildiğinde sesli uyarı alırsınız
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>📡</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Çevrimdışı Çalışır</Text>
              <Text style={styles.infoDescription}>
                Engel algılama internet bağlantısı gerektirmez
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>⚡</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Gerçek Zamanlı</Text>
              <Text style={styles.infoDescription}>
                Dil: {settings.language === 'tr' ? 'Türkçe' : 'İngilizce'} |
                Aralık: {settings.detectionInterval}ms
              </Text>
            </View>
          </View>
        </View>

        {/* Ayarlar Butonu */}
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
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  appIcon: { fontSize: 64, marginBottom: SPACING.md },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  activeNavCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  activeNavIcon: { fontSize: 36 },
  activeNavTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.large,
    fontWeight: '800',
    textAlign: 'center',
  },
  activeNavDetail: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  mainAction: { marginBottom: SPACING.xl },
  section: { marginBottom: SPACING.xl },
  sectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoSection: { gap: SPACING.md, marginBottom: SPACING.xl },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoIcon: { fontSize: 32, marginRight: SPACING.md },
  infoContent: { flex: 1 },
  infoTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoDescription: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bottomAction: { marginTop: SPACING.md },
});
