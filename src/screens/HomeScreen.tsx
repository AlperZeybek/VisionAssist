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
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import AccessibleButton from '../components/AccessibleButton';
import ModeSelector from '../components/ModeSelector';
import { useAppContext } from '../context/AppContext';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';

type TabParamList = {
  Ana: undefined;
  Algılama: undefined;
  Ayarlar: undefined;
};

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { currentMode, setCurrentMode, settings } = useAppContext();

  const handleStartDetection = () => {
    navigation.navigate('Algılama');
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

        {/* Ana Buton - Algılamayı Başlat */}
        <View style={styles.mainAction}>
          <AccessibleButton
            label="Algılamayı Başlat"
            onPress={handleStartDetection}
            accessibilityHint="Kamerayı açarak engel algılamaya başlar"
            icon="📸"
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
                İnternet bağlantısı gerektirmez
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
            onPress={() => navigation.navigate('Ayarlar')}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  appIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
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
  mainAction: {
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoSection: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
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
  bottomAction: {
    marginTop: SPACING.md,
  },
});
