/**
 * VisionAssist - Navigasyon Bağlam Sağlayıcısı
 *
 * Hedef seçimi, hesaplanan rota, mevcut adım indeksi ve canlı konum
 * verilerini uygulama genelinde paylaşır.
 *
 * Konum izleme `expo-location` ile yapılır. Permission ret edilir veya
 * eklenmemişse `currentLocation` null kalır; bu durumda HomeScreen
 * kullanıcıya gerekli izinleri açma talimatı verir.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import * as Location from 'expo-location';
import {
  GeoPoint,
  NavigationRoute,
  PlaceResult,
  navigationService,
} from '../services/navigation/NavigationService';
import { speechService } from '../services/accessibility/SpeechService';

// ==========================================
// FAVORİLER (önceden tanımlı yerler)
// ==========================================

export interface FavoritePlace {
  id: string;
  label: string;
  icon: string;
  /** Sesli okuma için açıklama */
  description: string;
  /** Nominatim'de aranacak terim */
  searchQuery: string;
}

/**
 * Görme engelliler için sık ihtiyaç duyulabilecek yerler.
 * Bu kategoriler "yakınımdaki" sorgular olarak kullanılır.
 */
export const DEFAULT_FAVORITES: FavoritePlace[] = [
  {
    id: 'pharmacy',
    label: 'En yakın eczane',
    icon: '💊',
    description: 'Yakınımdaki eczaneyi bul',
    searchQuery: 'eczane',
  },
  {
    id: 'hospital',
    label: 'En yakın hastane',
    icon: '🏥',
    description: 'Yakınımdaki hastane veya sağlık ocağı',
    searchQuery: 'hastane',
  },
  {
    id: 'market',
    label: 'En yakın market',
    icon: '🛒',
    description: 'Yakınımdaki market veya bakkal',
    searchQuery: 'market',
  },
  {
    id: 'bus_stop',
    label: 'En yakın otobüs durağı',
    icon: '🚌',
    description: 'Yakınımdaki toplu taşıma durağı',
    searchQuery: 'otobüs durağı',
  },
  {
    id: 'cafe',
    label: 'En yakın kafe',
    icon: '☕',
    description: 'Yakınımdaki kafe veya restoran',
    searchQuery: 'kafe',
  },
  {
    id: 'park',
    label: 'En yakın park',
    icon: '🌳',
    description: 'Yakınımdaki park veya yeşil alan',
    searchQuery: 'park',
  },
];

// ==========================================
// CONTEXT TİPLERİ
// ==========================================

interface NavigationContextValue {
  /** Konum izni durumu */
  hasLocationPermission: boolean;
  /** Konum izni isteme */
  requestLocationPermission: () => Promise<boolean>;
  /** Anlık kullanıcı konumu */
  currentLocation: GeoPoint | null;
  /** Konum izleme aktif mi */
  isWatchingLocation: boolean;

  /** Hesaplanmış aktif rota */
  route: NavigationRoute | null;
  /** Mevcut adım indeksi */
  currentStepIndex: number;
  /** Aktif rehberlik açık mı */
  isGuiding: boolean;
  /** Hedefe kalan toplam mesafe (m) */
  remainingDistanceMeters: number;

  /** Yer arama */
  searchPlaces: (query: string) => Promise<PlaceResult[]>;
  /** Hedef seçilip rota hesapla */
  startNavigationToPlace: (place: PlaceResult) => Promise<boolean>;
  /** Favori (kategori) ile başlat — yakındaki eşleşmeyi bulur */
  startNavigationToFavorite: (favorite: FavoritePlace) => Promise<boolean>;
  /** Adım rehberliğini durdur */
  stopNavigation: () => void;

  /** Favori liste */
  favorites: FavoritePlace[];
}

const NavigationContext = createContext<NavigationContextValue | undefined>(
  undefined
);

// ==========================================
// PROVIDER
// ==========================================

interface NavigationProviderProps {
  children: ReactNode;
}

const STEP_REACHED_RADIUS_METERS = 25;

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null);
  const [isWatchingLocation, setIsWatchingLocation] = useState(false);

  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isGuiding, setIsGuiding] = useState(false);
  const [remainingDistanceMeters, setRemainingDistanceMeters] = useState(0);

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastSpokenStepRef = useRef<number>(-1);

  // Konum izni iste — uygulama açılışında
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasLocationPermission(true);
          startWatching();
        }
      } catch (err) {
        console.warn('[NavigationContext] Konum izni okuma hatası:', err);
      }
    })();
    return () => {
      stopWatching();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWatching = useCallback(async () => {
    if (watcherRef.current) return;
    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 2000,
        },
        (loc) => {
          setCurrentLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
      watcherRef.current = sub;
      setIsWatchingLocation(true);
    } catch (err) {
      console.warn('[NavigationContext] Konum izleme başlatılamadı:', err);
    }
  }, []);

  const stopWatching = useCallback(() => {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }
    setIsWatchingLocation(false);
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasLocationPermission(granted);
      if (granted) {
        const last = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentLocation({
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
        });
        await startWatching();
      } else {
        speechService.speak(
          'Konum izni verilmediği için navigasyon kullanılamaz.'
        );
      }
      return granted;
    } catch (err) {
      console.warn('[NavigationContext] Konum izni hatası:', err);
      return false;
    }
  }, [startWatching]);

  // ==========================================
  // YER ARAMA & ROTA BAŞLATMA
  // ==========================================

  const searchPlaces = useCallback(
    async (query: string) => {
      return navigationService.searchPlaces(query, 8, currentLocation ?? undefined);
    },
    [currentLocation]
  );

  const startNavigationToPlace = useCallback(
    async (place: PlaceResult): Promise<boolean> => {
      if (!currentLocation) {
        speechService.speak(
          'Konumunuz alınamadı. Lütfen konum izni verin ve tekrar deneyin.'
        );
        return false;
      }
      speechService.speak(`Rota hesaplanıyor: ${place.shortName}`);
      const computed = await navigationService.getWalkingRoute(
        currentLocation,
        place
      );
      if (!computed || computed.steps.length === 0) {
        speechService.speak('Üzgünüm, bu hedefe rota bulunamadı.');
        return false;
      }
      setRoute(computed);
      setCurrentStepIndex(0);
      setRemainingDistanceMeters(computed.totalDistanceMeters);
      setIsGuiding(true);
      lastSpokenStepRef.current = -1;

      const km = (computed.totalDistanceMeters / 1000).toFixed(1);
      const minutes = Math.max(1, Math.round(computed.durationSeconds / 60));
      speechService.speak(
        `${place.shortName}'a doğru ${km} kilometre, yaklaşık ${minutes} dakikalık yürüyüş. ${computed.steps[0].instruction}`
      );
      return true;
    },
    [currentLocation]
  );

  const startNavigationToFavorite = useCallback(
    async (favorite: FavoritePlace): Promise<boolean> => {
      if (!currentLocation) {
        speechService.speak('Konumunuz alınamadı.');
        return false;
      }
      speechService.speak(`${favorite.label} aranıyor`);
      const results = await navigationService.searchPlaces(
        favorite.searchQuery,
        5,
        currentLocation
      );
      if (results.length === 0) {
        speechService.speak('Yakınınızda eşleşme bulunamadı.');
        return false;
      }
      // En yakını seç
      const nearest = results.reduce((best, p) =>
        navigationService.haversineDistance(currentLocation, p) <
        navigationService.haversineDistance(currentLocation, best)
          ? p
          : best
      );
      return startNavigationToPlace(nearest);
    },
    [currentLocation, startNavigationToPlace]
  );

  const stopNavigation = useCallback(() => {
    setRoute(null);
    setCurrentStepIndex(0);
    setIsGuiding(false);
    setRemainingDistanceMeters(0);
    lastSpokenStepRef.current = -1;
    speechService.speak('Navigasyon durduruldu.');
  }, []);

  // ==========================================
  // ADIM İLERLEME — KONUM DEĞİŞTİKÇE
  // ==========================================

  useEffect(() => {
    if (!isGuiding || !route || !currentLocation) return;

    const step = route.steps[currentStepIndex];
    if (!step) return;

    // Adımın bitiş noktasına olan mesafe
    const distToEnd = navigationService.haversineDistance(
      currentLocation,
      step.endLocation
    );

    // Adım sonuna yakın isek bir sonraki adıma geç
    if (distToEnd < STEP_REACHED_RADIUS_METERS) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex >= route.steps.length) {
        // Hedefe ulaşıldı
        speechService.speak('Hedefinize ulaştınız.');
        setIsGuiding(false);
        setRoute(null);
        return;
      }
      setCurrentStepIndex(nextIndex);
      lastSpokenStepRef.current = nextIndex;
      speechService.speak(route.steps[nextIndex].instruction);
      return;
    }

    // Adım yaklaşırken haber ver (henüz seslendirilmediyse)
    if (
      lastSpokenStepRef.current !== currentStepIndex &&
      distToEnd < 60
    ) {
      lastSpokenStepRef.current = currentStepIndex;
      speechService.speak(`Yaklaşık ${Math.round(distToEnd)} metre sonra: ${step.instruction}`);
    }

    // Kalan mesafeyi güncelle
    let remaining = distToEnd;
    for (let i = currentStepIndex + 1; i < route.steps.length; i++) {
      remaining += route.steps[i].distanceMeters;
    }
    setRemainingDistanceMeters(Math.round(remaining));
  }, [currentLocation, isGuiding, route, currentStepIndex]);

  const value = useMemo<NavigationContextValue>(
    () => ({
      hasLocationPermission,
      requestLocationPermission,
      currentLocation,
      isWatchingLocation,
      route,
      currentStepIndex,
      isGuiding,
      remainingDistanceMeters,
      searchPlaces,
      startNavigationToPlace,
      startNavigationToFavorite,
      stopNavigation,
      favorites: DEFAULT_FAVORITES,
    }),
    [
      hasLocationPermission,
      requestLocationPermission,
      currentLocation,
      isWatchingLocation,
      route,
      currentStepIndex,
      isGuiding,
      remainingDistanceMeters,
      searchPlaces,
      startNavigationToPlace,
      startNavigationToFavorite,
      stopNavigation,
    ]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx)
    throw new Error('useNavigationContext, NavigationProvider içinde kullanılmalıdır');
  return ctx;
}

export default NavigationContext;
