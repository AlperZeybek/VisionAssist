/**
 * VisionAssist - Durum Göstergesi Bileşeni
 * 
 * Mevcut algılama durumunu görsel ve erişilebilir
 * şekilde gösteren bileşen.
 * 
 * Bilgiler:
 * - Algılama durumu (aktif/pasif)
 * - İşleme süresi
 * - Tespit edilen engel sayısı
 * - Risk seviyesi göstergesi
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RiskLevel, ObstacleInfo } from '../utils/types';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';
import { getRiskColor } from '../utils/helpers';

interface StatusIndicatorProps {
  /** Algılama aktif mi */
  isDetecting: boolean;
  /** İşleme süresi (ms) */
  processingTime: number;
  /** İşlenen kare sayısı */
  frameCount: number;
  /** Tespit edilen engeller */
  obstacles: ObstacleInfo[];
}

export default function StatusIndicator({
  isDetecting,
  processingTime,
  frameCount,
  obstacles,
}: StatusIndicatorProps) {
  // En yüksek risk seviyesini bul
  const highestRisk = obstacles.reduce<RiskLevel>(
    (max, obs) => {
      const riskOrder = {
        [RiskLevel.HIGH]: 3,
        [RiskLevel.MEDIUM]: 2,
        [RiskLevel.LOW]: 1,
        [RiskLevel.NONE]: 0,
      };
      return riskOrder[obs.riskLevel] > riskOrder[max]
        ? obs.riskLevel
        : max;
    },
    RiskLevel.NONE
  );

  const riskColor = getRiskColor(highestRisk);
  const statusText = isDetecting ? 'Algılama Aktif' : 'Algılama Kapalı';
  const obstacleCount = obstacles.filter(
    (o) => o.riskLevel !== RiskLevel.NONE
  ).length;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`${statusText}. ${obstacleCount} engel tespit edildi. İşleme süresi ${processingTime} milisaniye.`}
      accessibilityLiveRegion="polite"
    >
      {/* Durum göstergesi ışığı */}
      <View style={styles.row}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isDetecting ? COLORS.secondary : COLORS.riskNone },
          ]}
        />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      {/* İstatistikler */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{obstacleCount}</Text>
          <Text style={styles.statLabel}>Engel</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statValue}>{processingTime}ms</Text>
          <Text style={styles.statLabel}>İşleme</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statValue}>{frameCount}</Text>
          <Text style={styles.statLabel}>Kare</Text>
        </View>

        {/* Risk seviyesi */}
        <View style={styles.stat}>
          <View
            style={[styles.riskBadge, { backgroundColor: riskColor }]}
          >
            <Text style={styles.riskText}>
              {highestRisk === RiskLevel.NONE ? '✓' : '!'}
            </Text>
          </View>
          <Text style={styles.statLabel}>Risk</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  statusText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.medium,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.small - 2,
    marginTop: 2,
  },
  riskBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.small,
    fontWeight: '800',
  },
});
