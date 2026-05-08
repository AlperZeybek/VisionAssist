/**
 * VisionAssist - Navigasyon Servisi
 *
 * Açık kaynak servisleri kullanarak yer arama ve yol tarifi sağlar:
 * - Nominatim (https://nominatim.openstreetmap.org) — yer arama (geocoding)
 * - OSRM Demo (https://router.project-osrm.org) — yaya yol tarifi
 *
 * Anahtar gerektirmez. Üretim için kendi sunucunuzu kullanmanız önerilir
 * (Nominatim public API saniyede 1 istek limitlidir, OSRM demo public'tir).
 */

import { Direction } from '../../utils/types';

// ==========================================
// TİPLER
// ==========================================

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface PlaceResult {
  /** Yerin gösterim adı (Nominatim'den) */
  displayName: string;
  /** Kısa, ilk kelime — sesli okuma için */
  shortName: string;
  latitude: number;
  longitude: number;
  /** Nominatim place id */
  placeId?: string;
}

/** OSRM tek bir adım — sesli yönlendirme için yorumlanmış */
export interface RouteStep {
  /** İnsan-okunur talimat (TR) */
  instruction: string;
  /** Adımın bittiği nokta */
  endLocation: GeoPoint;
  /** Adımın uzunluğu (metre) */
  distanceMeters: number;
  /** Manevra türü: turn / depart / arrive vb. */
  maneuver: string;
  /** Yön değişimi: left / right / straight */
  modifier?: 'left' | 'right' | 'straight' | 'slight left' | 'slight right' | 'sharp left' | 'sharp right' | 'uturn';
}

export interface NavigationRoute {
  /** Toplam mesafe (metre) */
  totalDistanceMeters: number;
  /** Tahmini süre (saniye) */
  durationSeconds: number;
  /** Adım listesi */
  steps: RouteStep[];
  /** Ham koordinatlar (haritada çizmek için ileride) */
  geometry: GeoPoint[];
  /** Hedef yer */
  destination: PlaceResult;
}

// ==========================================
// SABİT URL'LER
// ==========================================

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';

const USER_AGENT = 'VisionAssist/1.0 (https://github.com/akcasoft/visionassist)';

// ==========================================
// SERVİS
// ==========================================

class NavigationService {
  /**
   * Yer arar (geocoding).
   *
   * @param query Aranacak yer adı (örn. "Taksim Meydanı")
   * @param limit Maksimum sonuç sayısı (varsayılan 5)
   * @param near Sonuçları belirli bir konuma yakın olanlardan filtrele (opsiyonel)
   */
  async searchPlaces(
    query: string,
    limit: number = 5,
    near?: GeoPoint
  ): Promise<PlaceResult[]> {
    if (!query || query.trim().length < 2) return [];

    const params = new URLSearchParams({
      q: query.trim(),
      format: 'json',
      limit: String(limit),
      'accept-language': 'tr',
      addressdetails: '1',
    });

    // Yakındakilere öncelik ver — viewbox ~50 km
    if (near) {
      const delta = 0.45; // ~50 km
      const left = near.longitude - delta;
      const right = near.longitude + delta;
      const top = near.latitude + delta;
      const bottom = near.latitude - delta;
      params.set('viewbox', `${left},${top},${right},${bottom}`);
      params.set('bounded', '0');
    }

    const url = `${NOMINATIM_BASE}/search?${params.toString()}`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        console.warn('[NavigationService] Nominatim hata kodu:', res.status);
        return [];
      }
      const data = (await res.json()) as Array<{
        display_name: string;
        lat: string;
        lon: string;
        place_id?: number;
        name?: string;
      }>;

      return data.map((item) => ({
        displayName: item.display_name,
        shortName: item.name || item.display_name.split(',')[0].trim(),
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        placeId: item.place_id ? String(item.place_id) : undefined,
      }));
    } catch (error) {
      console.warn('[NavigationService] Yer arama hatası:', error);
      return [];
    }
  }

  /**
   * İki nokta arasında yaya yol tarifi alır.
   */
  async getWalkingRoute(
    origin: GeoPoint,
    destination: PlaceResult
  ): Promise<NavigationRoute | null> {
    const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const url = `${OSRM_BASE}/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=true&annotations=false`;

    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        console.warn('[NavigationService] OSRM hata kodu:', res.status);
        return null;
      }
      const data = await res.json();
      if (!data.routes || data.routes.length === 0) return null;

      const route = data.routes[0];
      const steps: RouteStep[] = [];

      for (const leg of route.legs ?? []) {
        for (const step of leg.steps ?? []) {
          const maneuver = step.maneuver?.type ?? 'continue';
          const modifier = step.maneuver?.modifier;
          const distance = Math.round(step.distance ?? 0);

          steps.push({
            instruction: this.translateStep(maneuver, modifier, distance, step.name),
            endLocation: {
              latitude: step.maneuver?.location?.[1] ?? destination.latitude,
              longitude: step.maneuver?.location?.[0] ?? destination.longitude,
            },
            distanceMeters: distance,
            maneuver,
            modifier,
          });
        }
      }

      const geometry: GeoPoint[] = (route.geometry?.coordinates ?? []).map(
        (c: [number, number]) => ({ latitude: c[1], longitude: c[0] })
      );

      return {
        totalDistanceMeters: Math.round(route.distance ?? 0),
        durationSeconds: Math.round(route.duration ?? 0),
        steps,
        geometry,
        destination,
      };
    } catch (error) {
      console.warn('[NavigationService] Yol tarifi hatası:', error);
      return null;
    }
  }

  /**
   * OSRM manevrasını Türkçe sesli komuta çevirir.
   */
  private translateStep(
    maneuver: string,
    modifier: string | undefined,
    distance: number,
    streetName?: string
  ): string {
    const distText = this.formatDistance(distance);
    const street = streetName ? ` (${streetName})` : '';

    switch (maneuver) {
      case 'depart':
        return `Yola çık ve ${distText} düz git${street}`;
      case 'arrive':
        return 'Hedefinize ulaştınız';
      case 'turn':
      case 'end of road':
      case 'fork':
        return `${distText} sonra ${this.translateModifier(modifier)}`;
      case 'continue':
      case 'new name':
      case 'merge':
        return `${distText} düz devam et${street}`;
      case 'roundabout':
      case 'rotary':
        return `Döner kavşağa girin, ${this.translateModifier(modifier)}`;
      case 'roundabout turn':
        return `Döner kavşaktan ${this.translateModifier(modifier)}`;
      default:
        return `${distText} ${this.translateModifier(modifier)}`;
    }
  }

  private translateModifier(modifier?: string): string {
    switch (modifier) {
      case 'left':
        return 'sola dönün';
      case 'right':
        return 'sağa dönün';
      case 'slight left':
        return 'hafif sola dönün';
      case 'slight right':
        return 'hafif sağa dönün';
      case 'sharp left':
        return 'keskin sola dönün';
      case 'sharp right':
        return 'keskin sağa dönün';
      case 'uturn':
        return 'U dönüşü yapın';
      case 'straight':
        return 'düz devam edin';
      default:
        return 'devam edin';
    }
  }

  private formatDistance(meters: number): string {
    if (meters < 20) return 'Birkaç metre';
    if (meters < 100) return `${Math.round(meters / 10) * 10} metre`;
    if (meters < 1000) return `${Math.round(meters / 50) * 50} metre`;
    return `${(meters / 1000).toFixed(1)} kilometre`;
  }

  /**
   * İki nokta arası mesafeyi hesaplar (haversine, metre).
   */
  haversineDistance(a: GeoPoint, b: GeoPoint): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const c =
      sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(c)));
  }

  /**
   * OSRM modifier'ından engel-uyarı yönüne çevirir.
   * (Algılama uyarılarıyla aynı dili kullanmak için.)
   */
  modifierToDirection(modifier?: string): Direction {
    if (!modifier) return Direction.CENTER;
    if (modifier.includes('left')) return Direction.LEFT;
    if (modifier.includes('right')) return Direction.RIGHT;
    return Direction.CENTER;
  }
}

export const navigationService = new NavigationService();
export default NavigationService;
