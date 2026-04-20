/**
 * VisionAssist - Uygulama Ayarları Yönetimi
 * 
 * AsyncStorage üzerinden ayar okuma/yazma işlemlerini yönetir.
 * Uygulama ilk açıldığında varsayılan ayarlar yüklenir.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../utils/types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../utils/constants';

/**
 * Kayıtlı ayarları AsyncStorage'dan yükler.
 * Kayıtlı ayar yoksa varsayılan ayarları döndürür.
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.settings);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppSettings>;
      // Varsayılanlarla birleştir (eksik alanları tamamla)
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.warn('[Settings] Ayarlar yüklenirken hata:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Ayarları AsyncStorage'a kaydeder.
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch (error) {
    console.error('[Settings] Ayarlar kaydedilirken hata:', error);
  }
}

/**
 * Tek bir ayar değerini günceller.
 */
export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<AppSettings> {
  const current = await loadSettings();
  const updated = { ...current, [key]: value };
  await saveSettings(updated);
  return updated;
}

/**
 * Ayarları varsayılana sıfırlar.
 */
export async function resetSettings(): Promise<AppSettings> {
  await saveSettings(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
}
