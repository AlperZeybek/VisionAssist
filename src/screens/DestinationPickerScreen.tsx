/**
 * VisionAssist - Hedef Seçim Ekranı
 *
 * Görme engelliler için tasarlanmış erişilebilir hedef belirleme akışı:
 * - Büyük "yakındaki" kategori kartları (eczane, hastane, market...)
 * - Manuel arama (Nominatim üzerinden)
 * - Sesli geri bildirim (her seçim ve sonuç sözle duyurulur)
 *
 * Hedef seçilince rota hesaplanır ve kullanıcı CameraScreen'e yönlendirilir
 * (yürürken hem engel hem yön rehberliği aynı anda çalışır).
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import AccessibleButton from '../components/AccessibleButton';
import {
  useNavigationContext,
  FavoritePlace,
} from '../context/NavigationContext';
import { PlaceResult } from '../services/navigation/NavigationService';
import { speechService } from '../services/accessibility/SpeechService';
import { COLORS, FONT_SIZES, SPACING, MIN_TOUCH_SIZE } from '../utils/constants';

type RootStackParamList = {
  MainTabs: { focusCamera?: boolean } | undefined;
  DestinationPicker: undefined;
};

export default function DestinationPickerScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    favorites,
    hasLocationPermission,
    requestLocationPermission,
    currentLocation,
    searchPlaces,
    startNavigationToFavorite,
    startNavigationToPlace,
  } = useNavigationContext();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStartingNav, setIsStartingNav] = useState(false);

  const handleRequestPermission = useCallback(async () => {
    const ok = await requestLocationPermission();
    if (ok) {
      speechService.speak('Konum izni verildi. Hedefinizi seçebilirsiniz.');
    }
  }, [requestLocationPermission]);

  const handleFavoritePress = useCallback(
    async (favorite: FavoritePlace) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (!hasLocationPermission || !currentLocation) {
        Alert.alert(
          'Konum gerekli',
          'Bu özelliği kullanmak için konum iznine ihtiyacımız var.'
        );
        speechService.speak(
          'Bu özelliği kullanmak için önce konum izni vermelisiniz.'
        );
        return;
      }
      setIsStartingNav(true);
      const ok = await startNavigationToFavorite(favorite);
      setIsStartingNav(false);
      if (ok) navigation.navigate('MainTabs', { focusCamera: true });
    },
    [hasLocationPermission, currentLocation, startNavigationToFavorite, navigation]
  );

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      speechService.speak('Lütfen daha uzun bir arama yazın.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSearching(true);
    speechService.speak(`${query} aranıyor`);
    const found = await searchPlaces(query);
    setResults(found);
    setIsSearching(false);
    if (found.length === 0) {
      speechService.speak('Sonuç bulunamadı.');
    } else {
      speechService.speak(
        `${found.length} sonuç bulundu. İlk sonuç: ${found[0].shortName}`
      );
    }
  }, [query, searchPlaces]);

  const handleResultPress = useCallback(
    async (place: PlaceResult) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (!hasLocationPermission || !currentLocation) {
        speechService.speak('Konum izni gerekli.');
        return;
      }
      setIsStartingNav(true);
      const ok = await startNavigationToPlace(place);
      setIsStartingNav(false);
      if (ok) navigation.navigate('MainTabs', { focusCamera: true });
    },
    [hasLocationPermission, currentLocation, startNavigationToPlace, navigation]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View
          accessible={true}
          accessibilityRole="header"
          style={styles.header}
        >
          <Text style={styles.appIcon}>🧭</Text>
          <Text style={styles.title}>Nereye Gitmek İstersiniz?</Text>
          <Text style={styles.subtitle}>
            Yakındaki bir yer seçin veya arayın. Yürüyüş sırasında sesli rehberlik yapacağım.
          </Text>
        </View>

        {/* Konum İzni Uyarısı */}
        {!hasLocationPermission && (
          <View
            style={styles.warningCard}
            accessible={true}
            accessibilityLabel="Konum izni gerekli uyarısı"
          >
            <Text style={styles.warningIcon}>📍</Text>
            <Text style={styles.warningText}>
              Navigasyon için konum izninize ihtiyacımız var.
            </Text>
            <AccessibleButton
              label="Konum İzni Ver"
              onPress={handleRequestPermission}
              icon="🔐"
              variant="primary"
              fullWidth
              accessibilityHint="Cihaz konum izni ister"
            />
          </View>
        )}

        {/* Hızlı seçim — favoriler */}
        <Text style={styles.sectionTitle}>Hızlı Seçim</Text>
        <View
          accessible={true}
          accessibilityLabel="Yakındaki hızlı kategoriler"
          accessibilityRole="menu"
        >
          {favorites.map((fav) => (
            <TouchableOpacity
              key={fav.id}
              style={styles.favoriteCard}
              onPress={() => handleFavoritePress(fav)}
              disabled={isStartingNav}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={fav.label}
              accessibilityHint={fav.description}
              activeOpacity={0.7}
            >
              <Text style={styles.favoriteIcon}>{fav.icon}</Text>
              <View style={styles.favoriteContent}>
                <Text style={styles.favoriteLabel}>{fav.label}</Text>
                <Text style={styles.favoriteDescription}>
                  {fav.description}
                </Text>
              </View>
              <Text style={styles.favoriteArrow}></Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Manuel arama */}
        <Text style={styles.sectionTitle}>Yer Ara</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Adres, mahalle veya işletme..."
            placeholderTextColor={COLORS.textDisabled}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessible={true}
            accessibilityLabel="Hedef arama kutusu"
            accessibilityHint="Gitmek istediğiniz yerin adını yazın"
          />
        </View>
        <AccessibleButton
          label={isSearching ? 'Aranıyor...' : 'Ara'}
          onPress={handleSearch}
          icon="🔍"
          variant="primary"
          fullWidth
          disabled={isSearching || query.trim().length < 2}
          accessibilityHint="Yazdığınız yeri arar"
        />

        {/* Arama sonuçları */}
        {results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Sonuçlar</Text>
            {results.map((place, idx) => (
              <TouchableOpacity
                key={`${place.placeId ?? idx}`}
                style={styles.resultCard}
                onPress={() => handleResultPress(place)}
                disabled={isStartingNav}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={place.shortName}
                accessibilityHint={place.displayName}
                activeOpacity={0.7}
              >
                <Text style={styles.resultIcon}>📍</Text>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {place.shortName}
                  </Text>
                  <Text style={styles.resultDetail} numberOfLines={2}>
                    {place.displayName}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Yükleniyor durumu */}
        {(isSearching || isStartingNav) && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>
              {isStartingNav ? 'Rota hesaplanıyor...' : 'Aranıyor...'}
            </Text>
          </View>
        )}

        {/* İptal */}
        <View style={styles.cancelSection}>
          <AccessibleButton
            label="İptal Et"
            onPress={() => navigation.goBack()}
            icon="✖️"
            variant="secondary"
            fullWidth
            accessibilityHint="Hedef seçimini iptal eder ve geri döner"
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
  appIcon: { fontSize: 56, marginBottom: SPACING.sm },
  title: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  warningCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  warningIcon: { fontSize: 40 },
  warningText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.medium,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: MIN_TOUCH_SIZE + 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  favoriteIcon: { fontSize: 36, marginRight: SPACING.md },
  favoriteContent: { flex: 1 },
  favoriteLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  favoriteDescription: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.small - 2,
    marginTop: 2,
  },
  favoriteArrow: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  searchRow: { marginBottom: SPACING.md },
  searchInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.medium,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: MIN_TOUCH_SIZE,
  },
  resultsSection: { marginTop: SPACING.md },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: MIN_TOUCH_SIZE,
  },
  resultIcon: { fontSize: 24, marginRight: SPACING.sm },
  resultContent: { flex: 1 },
  resultTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  resultDetail: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.small - 2,
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.medium,
  },
  cancelSection: { marginTop: SPACING.xl },
});
