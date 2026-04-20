/**
 * VisionAssist - Engel Yerleşimi Bileşeni
 * 
 * Kamera görüntüsü üzerine engel konumlarını
 * renk kodlu olarak gösteren yarı-şeffaf katman.
 * 
 * Sol, Orta ve Sağ bölgelerin risk durumunu gösterir.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ObstacleInfo, Direction, RiskLevel } from '../utils/types';
import { COLORS, FONT_SIZES } from '../utils/constants';
import { getRiskColor } from '../utils/helpers';

interface ObstacleOverlayProps {
  /** Tespit edilen engeller */
  obstacles: ObstacleInfo[];
  /** Görünür mü */
  visible: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SECTOR_WIDTH = SCREEN_WIDTH / 3;

export default function ObstacleOverlay({
  obstacles,
  visible,
}: ObstacleOverlayProps) {
  if (!visible || obstacles.length === 0) return null;

  // Her yön için en yüksek riskli engeli bul
  const sectorObstacles = {
    [Direction.LEFT]: obstacles.find((o) => o.direction === Direction.LEFT),
    [Direction.CENTER]: obstacles.find((o) => o.direction === Direction.CENTER),
    [Direction.RIGHT]: obstacles.find((o) => o.direction === Direction.RIGHT),
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Sol Bölge */}
      <SectorIndicator
        obstacle={sectorObstacles[Direction.LEFT]}
        label="SOL"
        position="left"
      />

      {/* Orta Bölge */}
      <SectorIndicator
        obstacle={sectorObstacles[Direction.CENTER]}
        label="ORTA"
        position="center"
      />

      {/* Sağ Bölge */}
      <SectorIndicator
        obstacle={sectorObstacles[Direction.RIGHT]}
        label="SAĞ"
        position="right"
      />
    </View>
  );
}

interface SectorIndicatorProps {
  obstacle: ObstacleInfo | undefined;
  label: string;
  position: 'left' | 'center' | 'right';
}

function SectorIndicator({ obstacle, label, position }: SectorIndicatorProps) {
  if (!obstacle || obstacle.riskLevel === RiskLevel.NONE) {
    return <View style={styles.sector} />;
  }

  const riskColor = getRiskColor(obstacle.riskLevel);
  const opacity = obstacle.riskLevel === RiskLevel.HIGH ? 0.4 : 0.25;

  const distanceLabel =
    obstacle.distance === 'NEAR'
      ? 'YAKIN'
      : obstacle.distance === 'MEDIUM'
        ? 'ORTA'
        : 'UZAK';

  return (
    <View
      style={[
        styles.sector,
        { backgroundColor: riskColor + Math.round(opacity * 255).toString(16).padStart(2, '0') },
      ]}
      accessible={true}
      accessibilityLabel={`${label} bölgede ${distanceLabel} mesafede engel`}
    >
      <View style={[styles.indicator, { borderColor: riskColor }]}>
        <Text style={[styles.sectorLabel, { color: riskColor }]}>
          {label}
        </Text>
        <Text style={styles.distanceLabel}>{distanceLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  sector: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  indicator: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
  },
  sectorLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '800',
  },
  distanceLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.small - 2,
    fontWeight: '600',
    marginTop: 4,
  },
});
