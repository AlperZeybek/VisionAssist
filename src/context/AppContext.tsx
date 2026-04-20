/**
 * VisionAssist - Uygulama Bağlam Sağlayıcısı (Context Provider)
 * 
 * Uygulama genelinde paylaşılan durumu yönetir:
 * - Ayarlar
 * - Algılama modu
 * - Uygulama durumu
 * - Engel tespit sonuçları
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  AppSettings,
  DetectionMode,
  AppState,
  ObstacleInfo,
  FrameAnalysis,
} from '../utils/types';
import { DEFAULT_SETTINGS } from '../utils/constants';
import { loadSettings, saveSettings } from '../config/settings';
import { speechService } from '../services/accessibility/SpeechService';
import { getModeChangeMessage } from '../utils/helpers';

// ==========================================
// CONTEXT TİPLERİ
// ==========================================

interface AppContextType {
  // Durum
  settings: AppSettings;
  appState: AppState;
  currentMode: DetectionMode;
  lastAnalysis: FrameAnalysis | null;
  currentObstacles: ObstacleInfo[];

  // Ayar güncelleme
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Durum yönetimi
  setAppState: (state: AppState) => void;
  setCurrentMode: (mode: DetectionMode) => void;
  setLastAnalysis: (analysis: FrameAnalysis | null) => void;
  setCurrentObstacles: (obstacles: ObstacleInfo[]) => void;
}

// ==========================================
// CONTEXT OLUŞTURMA
// ==========================================

const AppContext = createContext<AppContextType | undefined>(undefined);

// ==========================================
// PROVIDER BİLEŞENİ
// ==========================================

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentMode, setCurrentModeState] = useState<DetectionMode>(
    DetectionMode.STREET
  );
  const [lastAnalysis, setLastAnalysis] = useState<FrameAnalysis | null>(null);
  const [currentObstacles, setCurrentObstacles] = useState<ObstacleInfo[]>([]);

  // Uygulama başlangıcında ayarları yükle
  useEffect(() => {
    (async () => {
      const loaded = await loadSettings();
      setSettings(loaded);
      setCurrentModeState(loaded.mode);

      // Konuşma servisini yapılandır
      speechService.setLanguage(loaded.language);
      speechService.setRate(loaded.speechRate);
      speechService.setPitch(loaded.speechPitch);
      speechService.setCooldown(loaded.notificationCooldown);
    })();
  }, []);

  // Ayar güncelleme fonksiyonu
  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await saveSettings(updated);

      // Konuşma servisini güncelle
      if (newSettings.language) {
        speechService.setLanguage(newSettings.language);
      }
      if (newSettings.speechRate !== undefined) {
        speechService.setRate(newSettings.speechRate);
      }
      if (newSettings.speechPitch !== undefined) {
        speechService.setPitch(newSettings.speechPitch);
      }
      if (newSettings.notificationCooldown !== undefined) {
        speechService.setCooldown(newSettings.notificationCooldown);
      }
    },
    [settings]
  );

  // Mod değiştirme fonksiyonu
  const setCurrentMode = useCallback(
    (mode: DetectionMode) => {
      setCurrentModeState(mode);
      // Mod değişikliğini sesli duyur
      const message = getModeChangeMessage(mode, settings.language);
      speechService.speak(message);
      // Ayarlarda da güncelle
      updateSettings({ mode });
    },
    [settings.language, updateSettings]
  );

  const value: AppContextType = {
    settings,
    appState,
    currentMode,
    lastAnalysis,
    currentObstacles,
    updateSettings,
    setAppState,
    setCurrentMode,
    setLastAnalysis,
    setCurrentObstacles,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ==========================================
// HOOK
// ==========================================

/**
 * Uygulama bağlamına erişim hook'u.
 * Tüm bileşenlerden uygulama durumuna erişim sağlar.
 */
export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext, AppProvider içinde kullanılmalıdır');
  }
  return context;
}

export default AppContext;
