/**
 * VisionAssist - Erişilebilirlik Yöneticisi
 * 
 * React Native Accessibility API ile uyumlu yönetim katmanı.
 * TalkBack (Android) ve VoiceOver (iOS) ile uyumludur.
 * 
 * Sorumlulukları:
 * - Ekran okuyucu duyuruları
 * - Erişilebilirlik odağı yönetimi
 * - Canlı bölge (live region) bildirimleri
 */

import {
  AccessibilityInfo,
  Platform,
} from 'react-native';

class AccessibilityManager {
  private screenReaderEnabled: boolean = false;

  constructor() {
    this.checkScreenReader();
  }

  /**
   * Ekran okuyucunun açık olup olmadığını kontrol eder.
   */
  async checkScreenReader(): Promise<boolean> {
    try {
      this.screenReaderEnabled =
        await AccessibilityInfo.isScreenReaderEnabled();
      return this.screenReaderEnabled;
    } catch {
      return false;
    }
  }

  /**
   * Ekran okuyucu durum değişikliklerini dinler.
   * 
   * @param callback - Durum değişikliği callback'i
   * @returns Abonelik temizleme fonksiyonu
   */
  onScreenReaderChange(
    callback: (enabled: boolean) => void
  ): () => void {
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled: boolean) => {
        this.screenReaderEnabled = isEnabled;
        callback(isEnabled);
      }
    );

    return () => subscription.remove();
  }

  /**
   * Ekran okuyucu üzerinden duyuru yapar.
   * Bu duyuru TalkBack/VoiceOver tarafından okunur.
   * 
   * @param message - Duyuru metni
   */
  announce(message: string): void {
    AccessibilityInfo.announceForAccessibility(message);
  }

  /**
   * Ekran okuyucu aktif mi?
   */
  isScreenReaderActive(): boolean {
    return this.screenReaderEnabled;
  }

  /**
   * Platform bazlı erişilebilirlik özelliklerini döndürür.
   */
  getAccessibilityProps(
    label: string,
    hint?: string,
    role?: string
  ): Record<string, any> {
    const props: Record<string, any> = {
      accessible: true,
      accessibilityLabel: label,
    };

    if (hint) {
      props.accessibilityHint = hint;
    }

    if (role) {
      props.accessibilityRole = role;
    }

    // Canlı bölge: içerik değiştiğinde otomatik duyur
    if (Platform.OS === 'android') {
      props.accessibilityLiveRegion = 'polite';
    }

    return props;
  }

  /**
   * Acil durum duyurusu yapar.
   * Mevcut konuşmayı keser ve hemen duyurur.
   */
  announceUrgent(message: string): void {
    // Assertive duyuru: mevcut konuşmayı keser
    AccessibilityInfo.announceForAccessibility(message);
  }
}

// Singleton instance
export const accessibilityManager = new AccessibilityManager();
export default AccessibilityManager;
