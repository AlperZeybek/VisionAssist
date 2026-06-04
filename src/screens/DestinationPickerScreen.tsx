/**
 * VisionAssist - Hedef Seçim Ekranı
 * Görme engelliler için erişilebilir navigasyon hedefi belirleme akışı.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import {
  useNavigationContext,
  FavoritePlace,
} from '../context/NavigationContext';
import { PlaceResult } from '../services/navigation/NavigationService';
import { speechService } from '../services/accessibility/SpeechService';
import { COLORS, FONT_SIZES, SPACING, MIN_TOUCH_SIZE } from '../utils/constants';

type RootStackParamList = {
  MainTabs: { screen?: string } | undefined;
  DestinationPicker: undefined;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = SPACING.sm;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - GRID_GAP) / 2;

/** Kategori renk ve ikon eşlemesi (görseldeki renklerle uyumlu) */
const CATEGORY_STYLE: Record<string, { bg: string; iconBg: string }> = {
  pharmacy:  { bg: '#0F2A1A', iconBg: '#1B7A3A' },
  hospital:  { bg: '#2A0F0F', iconBg: '#CC2222' },
  market:    { bg: '#2A1A00', iconBg: '#CC6600' },
  bus_stop:  { bg: '#0A1A2A', iconBg: '#1155CC' },
  cafe:      { bg: '#1A120A', iconBg: '#7A4A00' },
  park:      { bg: '#0F1E0F', iconBg: '#226622' },
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
    if (ok) speechService.speak('Konum izni verildi. Hedefinizi seçebilirsiniz.');
  }, [requestLocationPermission]);

  const handleFavoritePress = useCallback(
    async (favorite: FavoritePlace) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (!hasLocationPermission || !currentLocation) {
        Alert.alert('Konum gerekli', 'Bu özelliği kullanmak için konum iznine ihtiyacımız var.');
        speechService.speak('Bu özelliği kullanmak için önce konum izni vermelisiniz.');
        return;
      }
      setIsStartingNav(true);
      const ok = await startNavigationToFavorite(favorite);
      setIsStartingNav(false);
      if (ok) navigation.navigate('MainTabs', { screen: 'Algılama' });
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
      speechService.speak(`${found.length} sonuç bulundu. İlk sonuç: ${found[0].shortName}`);
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
      if (ok) navigation.navigate('MainTabs', { screen: 'Algılama' });
    },
    [hasLocationPermission, currentLocation, startNavigationToPlace, navigation]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* ── Mavi Header Bar ───────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Geri"
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hedef Seçin</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Konum İzni Uyarısı */}
        {!hasLocationPermission && (
          <TouchableOpacity
            style={styles.warningCard}
            onPress={handleRequestPermission}
            accessible
            accessibilityLabel="Konum izni gerekli. Dokunarak izin verin."
          >
            <Text style={styles.warningIcon}>📍</Text>
            <Text style={styles.warningText}>
              Navigasyon için konum izni gerekli
            </Text>
            <Text style={styles.warningAction}>İzin Ver</Text>
          </TouchableOpacity>
        )}

        {/* ── HIZLI SEÇİM ─────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>HIZLI SEÇİM</Text>
        <View style={styles.grid}>
          {favorites.map((fav) => {
            const style = CATEGORY_STYLE[fav.id] ?? { bg: COLORS.surface, iconBg: COLORS.primary };
            return (
              <TouchableOpacity
                key={fav.id}
                style={[styles.gridCard, { backgroundColor: style.bg }]}
                onPress={() => handleFavoritePress(fav)}
                disabled={isStartingNav}
                accessible
                accessibilityRole="button"
                accessibilityLabel={fav.label}
                accessibilityHint={fav.description}
                activeOpacity={0.75}
              >
                <View style={[styles.gridIconBox, { backgroundColor: style.iconBg }]}>
                  <Text style={styles.gridIcon}>{fav.icon}</Text>
                </View>
                <Text style={styles.gridLabel} numberOfLines={1}>
                  {fav.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── VEYA ARA ────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>VEYA ARA</Text>

        {/* Arama Alanı */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Hedef adresi yazın..."
            placeholderTextColor={COLORS.textDisabled}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessible
            accessibilityLabel="Hedef arama kutusu"
            accessibilityHint="Gitmek istediğiniz yerin adını yazın"
          />
          <TouchableOpacity
            style={styles.searchIconButton}
            onPress={handleSearch}
            disabled={isSearching}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Ara"
          >
            <Text style={styles.searchIconText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Arama Sonuçları */}
        {results.length > 0 && (
          <View style={styles.resultsSection}>
            {results.map((place, idx) => (
              <TouchableOpacity
                key={`${place.placeId ?? idx}`}
                style={styles.resultCard}
                onPress={() => handleResultPress(place)}
                disabled={isStartingNav}
                accessible
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

        {/* Yükleniyor */}
        {(isSearching || isStartingNav) && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>
              {isStartingNav ? 'Rota hesaplanıyor...' : 'Aranıyor...'}
            </Text>
          </View>
        )}

        {/* ── Rota Oluştur ─────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.routeButton,
            (isStartingNav || query.trim().length < 2) && styles.routeButtonDisabled,
          ]}
          onPress={handleSearch}
          disabled={isStartingNav || query.trim().length < 2}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Rota Oluştur"
        >
          <Text style={styles.routeButtonIcon}>📍</Text>
          <Text style={styles.routeButtonText}>Rota Oluştur</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Mavi header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  // Konum uyarısı
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    gap: SPACING.sm,
  },
  warningIcon: { fontSize: 22 },
  warningText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.small - 2,
  },
  warningAction: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.small - 2,
    fontWeight: '700',
  },

  // Bölüm başlığı
  sectionTitle: {
    fontSize: FONT_SIZES.small - 2,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.1,
    marginBottom: SPACING.sm,
  },
  sectionTitleSpaced: {
    marginTop: SPACING.xl,
  },

  // 2 sütun grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCard: {
    width: CARD_WIDTH,
    minHeight: MIN_TOUCH_SIZE + 24,
    borderRadius: 14,
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridIcon: { fontSize: 22 },
  gridLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.small - 2,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Arama
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.small,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: MIN_TOUCH_SIZE,
  },
  searchIconButton: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIconText: { fontSize: 22 },

  // Arama sonuçları
  resultsSection: { marginBottom: SPACING.md },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: MIN_TOUCH_SIZE,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  resultIcon: { fontSize: 20 },
  resultContent: { flex: 1 },
  resultTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.small,
    fontWeight: '700',
  },
  resultDetail: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.small - 4,
    marginTop: 2,
  },

  // Yükleniyor
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.small,
  },

  // Rota Oluştur butonu
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    minHeight: MIN_TOUCH_SIZE,
  },
  routeButtonDisabled: {
    opacity: 0.4,
  },
  routeButtonIcon: { fontSize: 20 },
  routeButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
});
