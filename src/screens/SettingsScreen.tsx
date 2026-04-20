/**
 * VisionAssist - Ayarlar Ekranı
 * 
 * Uygulama ayarlarını yönetme ekranı.
 * Tüm ayarlar AsyncStorage'da kalıcı olarak saklanır.
 * 
 * Ayarlar:
 * - Konuşma hızı
 * - Algılama aralığı
 * - Hassasiyet
 * - Dil seçimi
 * - Titreşim geri bildirimi
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  StatusBar,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useAppContext } from '../context/AppContext';
import AccessibleButton from '../components/AccessibleButton';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';
import { speechService } from '../services/accessibility/SpeechService';

export default function SettingsScreen() {
  const { settings, updateSettings } = useAppContext();
  const [testMessage, setTestMessage] = useState('');

  // Konuşma testi
  const handleTestSpeech = () => {
    const message =
      settings.language === 'tr'
        ? 'Bu bir konuşma testidir. Önünüzde engel var.'
        : 'This is a speech test. Obstacle ahead.';
    speechService.speak(message);
    setTestMessage(message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <Text style={styles.title}>Ayarlar</Text>

        {/* Dil Seçimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dil / Language</Text>
          <View style={styles.languageContainer}>
            <AccessibleButton
              label="Türkçe 🇹🇷"
              onPress={() => updateSettings({ language: 'tr' })}
              variant={settings.language === 'tr' ? 'primary' : 'secondary'}
              style={styles.langButton}
              accessibilityHint="Dili Türkçe olarak ayarlar"
            />
            <AccessibleButton
              label="English 🇬🇧"
              onPress={() => updateSettings({ language: 'en' })}
              variant={settings.language === 'en' ? 'primary' : 'secondary'}
              style={styles.langButton}
              accessibilityHint="Sets language to English"
            />
          </View>
        </View>

        {/* Konuşma Hızı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Konuşma Hızı: {settings.speechRate.toFixed(1)}x
          </Text>
          <Text style={styles.sectionHint}>
            Yavaş ← → Hızlı
          </Text>
          <View
            accessible={true}
            accessibilityRole="adjustable"
            accessibilityLabel={`Konuşma hızı: ${settings.speechRate.toFixed(1)} kat`}
            accessibilityHint="Sola veya sağa kaydırarak konuşma hızını ayarlayın"
          >
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.1}
              value={settings.speechRate}
              onSlidingComplete={(value) => updateSettings({ speechRate: value })}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
          </View>
        </View>

        {/* Algılama Aralığı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Algılama Aralığı: {settings.detectionInterval}ms
          </Text>
          <Text style={styles.sectionHint}>
            Hızlı (daha fazla pil) ← → Yavaş (daha az pil)
          </Text>
          <View
            accessible={true}
            accessibilityRole="adjustable"
            accessibilityLabel={`Algılama aralığı: ${settings.detectionInterval} milisaniye`}
          >
            <Slider
              style={styles.slider}
              minimumValue={400}
              maximumValue={1500}
              step={100}
              value={settings.detectionInterval}
              onSlidingComplete={(value) =>
                updateSettings({ detectionInterval: value })
              }
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
          </View>
        </View>

        {/* Hassasiyet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Hassasiyet: {Math.round(settings.sensitivity * 100)}%
          </Text>
          <Text style={styles.sectionHint}>
            Düşük ← → Yüksek (daha fazla uyarı)
          </Text>
          <View
            accessible={true}
            accessibilityRole="adjustable"
            accessibilityLabel={`Hassasiyet: yüzde ${Math.round(settings.sensitivity * 100)}`}
          >
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={1.0}
              step={0.1}
              value={settings.sensitivity}
              onSlidingComplete={(value) =>
                updateSettings({ sensitivity: value })
              }
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
          </View>
        </View>

        {/* Titreşim */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.sectionTitle}>Titreşim Geri Bildirimi</Text>
              <Text style={styles.sectionHint}>
                Butonlara basıldığında titreşim
              </Text>
            </View>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={(value) =>
                updateSettings({ hapticEnabled: value })
              }
              trackColor={{
                false: COLORS.border,
                true: COLORS.primary,
              }}
              thumbColor={COLORS.textPrimary}
              accessible={true}
              accessibilityLabel="Titreşim geri bildirimi"
              accessibilityRole="switch"
            />
          </View>
        </View>

        {/* Konuşma Testi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Konuşma Testi</Text>
          <AccessibleButton
            label="Sesi Test Et"
            onPress={handleTestSpeech}
            accessibilityHint="Mevcut ayarlarla bir test konuşması yapar"
            icon="🔊"
            variant="secondary"
            fullWidth
          />
          {testMessage !== '' && (
            <Text style={styles.testResult}>"{testMessage}"</Text>
          )}
        </View>

        {/* Sürüm Bilgisi */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>VisionAssist v1.0.0 MVP</Text>
          <Text style={styles.footerText}>
            Görme Engelli Bireyler İçin Gerçek Zamanlı Rehberlik
          </Text>
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
  title: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionHint: {
    fontSize: FONT_SIZES.small - 2,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  slider: {
    width: '100%',
    height: 48,
  },
  languageContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  langButton: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
    marginRight: SPACING.md,
  },
  testResult: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.small,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZES.small - 2,
    marginBottom: 4,
  },
});
