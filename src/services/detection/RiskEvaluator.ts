/**
 * VisionAssist - Risk Değerlendiricisi
 * 
 * Tespit edilen engelleri risk seviyelerine göre sıralar.
 * En yüksek riskli engel öncelikli olarak bildirilir.
 * 
 * Öncelik Sıralaması:
 * 1. ORTA + YAKIN → EN YÜKSEK RİSK
 * 2. SOL/SAĞ + YAKIN
 * 3. ORTA + ORTA MESAFE
 * 4. SOL/SAĞ + ORTA MESAFE
 * 5. UZAK mesafe → EN DÜŞÜK RİSK
 * 
 * Bildirim filtreleme (cooldown) sistemi de bu modülde
 * yönetilir. Aynı yön+mesafe kombinasyonu için belirli
 * bir süre tekrar bildirim gönderilmez.
 */

import {
  Direction,
  Distance,
  RiskLevel,
  ObstacleInfo,
} from '../../utils/types';
import {
  HIGH_RISK_COOLDOWN,
  MEDIUM_RISK_COOLDOWN,
  LOW_RISK_COOLDOWN,
  MIN_CONFIDENCE_THRESHOLD,
} from '../../utils/constants';
import { isCooldownExpired } from '../../utils/helpers';

/** Son bildirim zamanlarını takip eder */
interface NotificationRecord {
  direction: Direction;
  distance: Distance;
  timestamp: number;
}

class RiskEvaluator {
  /** Son bildirim kayıtları */
  private lastNotifications: NotificationRecord[] = [];

  /**
   * Engel listesini risk seviyesine göre değerlendirir ve sıralar.
   * 
   * @param obstacles - Tespit edilen engeller
   * @returns Risk seviyesine göre sıralanmış engeller
   */
  evaluateRisks(obstacles: ObstacleInfo[]): ObstacleInfo[] {
    // Her engele risk seviyesi ata
    const evaluated = obstacles.map((obstacle) => ({
      ...obstacle,
      riskLevel: this.calculateRiskLevel(obstacle.direction, obstacle.distance),
    }));

    // Risk seviyesine göre sırala (yüksek risk önce)
    return evaluated.sort((a, b) => {
      const riskOrder = {
        [RiskLevel.HIGH]: 0,
        [RiskLevel.MEDIUM]: 1,
        [RiskLevel.LOW]: 2,
        [RiskLevel.NONE]: 3,
      };

      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      if (riskDiff !== 0) return riskDiff;

      // Aynı risk seviyesinde güvenilirliğe göre sırala
      return b.confidence - a.confidence;
    });
  }

  /**
   * Yön ve mesafe kombinasyonuna göre risk seviyesi hesaplar.
   * 
   * @param direction - Engel yönü
   * @param distance - Tahmini mesafe
   * @returns Risk seviyesi
   */
  calculateRiskLevel(direction: Direction, distance: Distance): RiskLevel {
    // ORTA + YAKIN = EN YÜKSEK RİSK (çarpma tehlikesi!)
    if (direction === Direction.CENTER && distance === Distance.NEAR) {
      return RiskLevel.HIGH;
    }

    // SOL/SAĞ + YAKIN = YÜKSEK RİSK
    if (distance === Distance.NEAR) {
      return RiskLevel.HIGH;
    }

    // ORTA + ORTA MESAFE = ORTA RİSK
    if (direction === Direction.CENTER && distance === Distance.MEDIUM) {
      return RiskLevel.MEDIUM;
    }

    // SOL/SAĞ + ORTA MESAFE = DÜŞÜK RİSK
    if (distance === Distance.MEDIUM) {
      return RiskLevel.LOW;
    }

    // UZAK = RİSK YOK (sadece bilgilendirme)
    return RiskLevel.NONE;
  }

  /**
   * En yüksek riskli ve bildirilmesi gereken engeli seçer.
   * Cooldown sistemiyle filtreleme uygular.
   * 
   * @param obstacles - Risk değerlendirilmiş engeller
   * @returns Bildirilecek engel veya null
   */
  getHighestPriorityObstacle(
    obstacles: ObstacleInfo[]
  ): ObstacleInfo | null {
    // Risksiz ve düşük güvenilirlikli engelleri filtrele
    const significant = obstacles.filter(
      (obs) =>
        obs.riskLevel !== RiskLevel.NONE &&
        obs.confidence >= MIN_CONFIDENCE_THRESHOLD
    );

    if (significant.length === 0) return null;

    // Cooldown kontrolü: aynı yön+mesafe değilse veya süre dolduysa bildir
    for (const obstacle of significant) {
      if (this.shouldNotify(obstacle)) {
        // Bildirim kaydını güncelle
        this.recordNotification(obstacle);
        return obstacle;
      }
    }

    return null;
  }

  /**
   * Cooldown kontrolü: Bu engel için bildirim gönderilmeli mi?
   */
  private shouldNotify(obstacle: ObstacleInfo): boolean {
    const existing = this.lastNotifications.find(
      (n) =>
        n.direction === obstacle.direction &&
        n.distance === obstacle.distance
    );

    if (!existing) return true;

    // Risk seviyesine göre cooldown süresi
    const cooldown = this.getCooldownForRisk(obstacle.riskLevel);
    return isCooldownExpired(existing.timestamp, cooldown);
  }

  /**
   * Risk seviyesine göre cooldown süresi döndürür.
   * Yüksek risk = kısa cooldown (daha sık uyarı)
   */
  private getCooldownForRisk(risk: RiskLevel): number {
    switch (risk) {
      case RiskLevel.HIGH:
        return HIGH_RISK_COOLDOWN;
      case RiskLevel.MEDIUM:
        return MEDIUM_RISK_COOLDOWN;
      case RiskLevel.LOW:
        return LOW_RISK_COOLDOWN;
      default:
        return LOW_RISK_COOLDOWN;
    }
  }

  /**
   * Bildirim kaydını günceller.
   */
  private recordNotification(obstacle: ObstacleInfo): void {
    const existingIndex = this.lastNotifications.findIndex(
      (n) =>
        n.direction === obstacle.direction &&
        n.distance === obstacle.distance
    );

    const record: NotificationRecord = {
      direction: obstacle.direction,
      distance: obstacle.distance,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      this.lastNotifications[existingIndex] = record;
    } else {
      this.lastNotifications.push(record);
    }

    // Eski kayıtları temizle (maks 10 kayıt)
    if (this.lastNotifications.length > 10) {
      this.lastNotifications = this.lastNotifications.slice(-10);
    }
  }

  /**
   * Tüm bildirim kayıtlarını sıfırlar.
   */
  resetCooldowns(): void {
    this.lastNotifications = [];
  }
}

// Singleton instance
export const riskEvaluator = new RiskEvaluator();
export default RiskEvaluator;
