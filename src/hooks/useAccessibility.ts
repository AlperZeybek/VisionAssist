/**
 * VisionAssist - Erişilebilirlik Hook'u
 * 
 * Ekran okuyucu durumunu izler ve erişilebilirlik
 * duyurularını yönetir.
 */

import { useState, useEffect, useCallback } from 'react';
import { accessibilityManager } from '../services/accessibility/AccessibilityManager';

interface UseAccessibilityReturn {
  /** Ekran okuyucu aktif mi */
  screenReaderEnabled: boolean;
  /** Duyuru yap */
  announce: (message: string) => void;
  /** Acil duyuru yap */
  announceUrgent: (message: string) => void;
}

export function useAccessibility(): UseAccessibilityReturn {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    // İlk kontrol
    accessibilityManager.checkScreenReader().then(setScreenReaderEnabled);

    // Değişiklikleri dinle
    const unsubscribe = accessibilityManager.onScreenReaderChange(
      setScreenReaderEnabled
    );

    return unsubscribe;
  }, []);

  const announce = useCallback((message: string) => {
    accessibilityManager.announce(message);
  }, []);

  const announceUrgent = useCallback((message: string) => {
    accessibilityManager.announceUrgent(message);
  }, []);

  return {
    screenReaderEnabled,
    announce,
    announceUrgent,
  };
}

export default useAccessibility;
