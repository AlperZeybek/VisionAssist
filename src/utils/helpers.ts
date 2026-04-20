/**
 * VisionAssist - Yardımcı Fonksiyonlar
 * 
 * Uygulama genelinde kullanılan yardımcı fonksiyonlar.
 */

import { Direction, Distance, RiskLevel, ObstacleInfo } from './types';
import {
  SPEECH_MESSAGES_TR,
  SPEECH_MESSAGES_EN,
} from './constants';

/**
 * Benzersiz kimlik üretici
 * Engel takibi için basit bir benzersiz ID oluşturur.
 */
export function generateId(): string {
  return `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Engel için sesli uyarı mesajı oluşturur
 * Yön ve mesafe kombinasyonuna göre uygun mesajı seçer.
 * 
 * @param obstacle - Tespit edilen engel bilgisi
 * @param language - Dil tercihi ('tr' veya 'en')
 * @returns Sesli uyarı metni
 */
export function getObstacleMessage(
  obstacle: ObstacleInfo,
  language: 'tr' | 'en' = 'tr'
): string {
  const messages = language === 'tr' ? SPEECH_MESSAGES_TR : SPEECH_MESSAGES_EN;
  const { direction, distance } = obstacle;

  // Yön + Mesafe kombinasyonu
  if (distance === Distance.NEAR) {
    switch (direction) {
      case Direction.CENTER:
        return messages.nearCenter;
      case Direction.LEFT:
        return messages.nearLeft;
      case Direction.RIGHT:
        return messages.nearRight;
    }
  }

  if (distance === Distance.MEDIUM) {
    switch (direction) {
      case Direction.CENTER:
        return messages.mediumCenter;
      case Direction.LEFT:
        return messages.mediumLeft;
      case Direction.RIGHT:
        return messages.mediumRight;
    }
  }

  // Uzak mesafe - sadece yön
  switch (direction) {
    case Direction.CENTER:
      return messages.obstacleAhead;
    case Direction.LEFT:
      return messages.obstacleLeft;
    case Direction.RIGHT:
      return messages.obstacleRight;
  }
}

/**
 * Mod değişikliği mesajı oluşturur
 */
export function getModeChangeMessage(
  mode: string,
  language: 'tr' | 'en' = 'tr'
): string {
  const messages = language === 'tr' ? SPEECH_MESSAGES_TR : SPEECH_MESSAGES_EN;

  switch (mode) {
    case 'STREET':
      return messages.streetMode;
    case 'INDOOR':
      return messages.indoorMode;
    case 'NAVIGATION':
      return messages.navigationMode;
    default:
      return messages.modeChanged;
  }
}

/**
 * Risk seviyesine göre renk döndürür
 */
export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case RiskLevel.HIGH:
      return '#FF3B30';
    case RiskLevel.MEDIUM:
      return '#FF9500';
    case RiskLevel.LOW:
      return '#34C759';
    case RiskLevel.NONE:
      return '#8E8E93';
  }
}

/**
 * Sayıyı belirli bir aralığa sıkıştırır
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * İki sayı dizisi arasındaki ortalama farkı hesaplar
 * Kare değişim tespiti için kullanılır.
 */
export function calculateArrayDifference(arr1: number[], arr2: number[]): number {
  if (arr1.length === 0 || arr2.length === 0) return 0;
  const minLen = Math.min(arr1.length, arr2.length);
  let totalDiff = 0;
  
  for (let i = 0; i < minLen; i++) {
    totalDiff += Math.abs(arr1[i] - arr2[i]);
  }
  
  return totalDiff / minLen / 255; // 0-1 aralığına normalize et
}

/**
 * Parlaklık değerinin ortalamasını hesaplar
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Zaman damgası farkını kontrol eder (cooldown sistemi)
 * 
 * @param lastTimestamp - Son bildirim zamanı
 * @param cooldownMs - Minimum bekleme süresi
 * @returns Yeni bildirim gönderilip gönderilemeyeceği
 */
export function isCooldownExpired(lastTimestamp: number, cooldownMs: number): boolean {
  return Date.now() - lastTimestamp >= cooldownMs;
}
